//! Background job processing system
//!
//! Provides async job queue with retry, scheduling, and priority support

use bytes::Bytes;
use serde::{Deserialize, Serialize};
use std::collections::{BinaryHeap, HashMap};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::{mpsc, RwLock, Mutex};
use tokio::time;
use tracing::{info, warn, error, debug};

use crate::error::*;

/// Job ID type
pub type JobId = String;

/// Job status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum JobStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Retrying,
    Scheduled,
}

/// Job priority
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum JobPriority {
    Low = 0,
    Normal = 1,
    High = 2,
    Critical = 3,
}

/// Job configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobConfig {
    /// Maximum retry attempts
    pub max_retries: u32,
    /// Retry delay in milliseconds
    pub retry_delay: u64,
    /// Job timeout in milliseconds
    pub timeout: u64,
    /// Job priority
    pub priority: JobPriority,
    /// Scheduled time (Unix timestamp in milliseconds)
    pub scheduled_at: Option<u64>,
}

impl Default for JobConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            retry_delay: 1000,
            timeout: 30000,
            priority: JobPriority::Normal,
            scheduled_at: None,
        }
    }
}

/// Job definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    pub id: JobId,
    pub name: String,
    pub payload: Bytes,
    pub status: JobStatus,
    pub config: JobConfig,
    pub attempts: u32,
    pub created_at: u64,
    pub started_at: Option<u64>,
    pub completed_at: Option<u64>,
    pub error: Option<String>,
}

impl Job {
    /// Create a new job
    pub fn new(name: String, payload: Bytes, config: JobConfig) -> Self {
        let now = current_timestamp();
        
        Self {
            id: generate_job_id(),
            name,
            payload,
            status: if config.scheduled_at.is_some() {
                JobStatus::Scheduled
            } else {
                JobStatus::Pending
            },
            config,
            attempts: 0,
            created_at: now,
            started_at: None,
            completed_at: None,
            error: None,
        }
    }
    
    /// Check if job should be executed now
    pub fn should_execute(&self) -> bool {
        if let Some(scheduled_at) = self.config.scheduled_at {
            current_timestamp() >= scheduled_at
        } else {
            true
        }
    }
}

impl PartialEq for Job {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl Eq for Job {}

impl PartialOrd for Job {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Job {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        // Higher priority jobs come first
        self.config.priority.cmp(&other.config.priority)
            .then_with(|| self.created_at.cmp(&other.created_at))
    }
}

/// Job handler function
pub type JobHandler = Arc<dyn Fn(Job) -> Result<Bytes> + Send + Sync>;

/// Job queue manager
pub struct JobQueue {
    /// Pending jobs (priority queue)
    pending: Arc<RwLock<BinaryHeap<Job>>>,
    /// Processing jobs
    processing: Arc<RwLock<HashMap<JobId, Job>>>,
    /// Completed jobs (history)
    completed: Arc<RwLock<HashMap<JobId, Job>>>,
    /// Job handlers
    handlers: Arc<RwLock<HashMap<String, JobHandler>>>,
    /// Worker count
    worker_count: usize,
    /// Shutdown signal
    shutdown: Arc<RwLock<bool>>,
}

impl JobQueue {
    /// Create a new job queue
    pub fn new(worker_count: usize) -> Self {
        Self {
            pending: Arc::new(RwLock::new(BinaryHeap::new())),
            processing: Arc::new(RwLock::new(HashMap::new())),
            completed: Arc::new(RwLock::new(HashMap::new())),
            handlers: Arc::new(RwLock::new(HashMap::new())),
            worker_count,
            shutdown: Arc::new(RwLock::new(false)),
        }
    }

    /// Register a job handler
    pub async fn register<F>(&self, job_name: String, handler: F)
    where
        F: Fn(Job) -> Result<Bytes> + Send + Sync + 'static,
    {
        info!("Registering job handler: {}", job_name);
        self.handlers.write().await.insert(job_name, Arc::new(handler));
    }

    /// Add a job to the queue
    pub async fn add_job(&self, job: Job) -> JobId {
        let job_id = job.id.clone();
        info!("Adding job: {} ({})", job.name, job_id);
        
        self.pending.write().await.push(job);
        job_id
    }

    /// Create and add a job
    pub async fn enqueue(&self, name: String, payload: Bytes, config: JobConfig) -> JobId {
        let job = Job::new(name, payload, config);
        self.add_job(job).await
    }

    /// Schedule a job for later execution
    pub async fn schedule(
        &self,
        name: String,
        payload: Bytes,
        delay_ms: u64,
    ) -> JobId {
        let scheduled_at = current_timestamp() + delay_ms;
        let config = JobConfig {
            scheduled_at: Some(scheduled_at),
            ..Default::default()
        };
        
        self.enqueue(name, payload, config).await
    }

    /// Get job status
    pub async fn get_job(&self, job_id: &str) -> Option<Job> {
        // Check processing
        if let Some(job) = self.processing.read().await.get(job_id) {
            return Some(job.clone());
        }
        
        // Check completed
        if let Some(job) = self.completed.read().await.get(job_id) {
            return Some(job.clone());
        }
        
        // Check pending
        for job in self.pending.read().await.iter() {
            if job.id == job_id {
                return Some(job.clone());
            }
        }
        
        None
    }

    /// Get all pending jobs
    pub async fn get_pending_count(&self) -> usize {
        self.pending.read().await.len()
    }

    /// Get all processing jobs
    pub async fn get_processing_count(&self) -> usize {
        self.processing.read().await.len()
    }

    /// Get completed jobs count
    pub async fn get_completed_count(&self) -> usize {
        self.completed.read().await.len()
    }

    /// Start processing jobs
    pub async fn start(self: Arc<Self>) {
        info!("Starting job queue with {} workers", self.worker_count);

        // Start scheduler
        let queue = self.clone();
        tokio::spawn(async move {
            queue.run_scheduler().await;
        });

        // Start workers
        for i in 0..self.worker_count {
            let queue = self.clone();
            tokio::spawn(async move {
                info!("Starting worker {}", i);
                queue.run_worker(i).await;
            });
        }
    }

    /// Run scheduler (for delayed jobs)
    async fn run_scheduler(&self) {
        let mut interval = time::interval(Duration::from_millis(100));
        
        loop {
            interval.tick().await;
            
            if *self.shutdown.read().await {
                break;
            }

            // Check for scheduled jobs that are ready
            let mut pending = self.pending.write().await;
            let mut ready_jobs = Vec::new();
            let mut temp = BinaryHeap::new();

            while let Some(job) = pending.pop() {
                if job.status == JobStatus::Scheduled && job.should_execute() {
                    let mut ready_job = job;
                    ready_job.status = JobStatus::Pending;
                    ready_jobs.push(ready_job);
                } else {
                    temp.push(job);
                }
            }

            // Put back non-ready jobs
            for job in temp.into_iter() {
                pending.push(job);
            }

            // Add ready jobs back
            for job in ready_jobs {
                debug!("Scheduled job {} is now ready", job.id);
                pending.push(job);
            }
        }
    }

    /// Run worker
    async fn run_worker(&self, worker_id: usize) {
        loop {
            if *self.shutdown.read().await {
                info!("Worker {} shutting down", worker_id);
                break;
            }

            // Get next job
            let job = {
                let mut pending = self.pending.write().await;
                
                // Find first non-scheduled pending job
                let mut temp = BinaryHeap::new();
                let mut found_job = None;

                while let Some(job) = pending.pop() {
                    if job.status == JobStatus::Pending && job.should_execute() {
                        found_job = Some(job);
                        break;
                    } else {
                        temp.push(job);
                    }
                }

                // Put back jobs we didn't process
                for job in temp.into_iter() {
                    pending.push(job);
                }

                found_job
            };

            if let Some(mut job) = job {
                debug!("Worker {} processing job {}", worker_id, job.id);
                
                // Mark as processing
                job.status = JobStatus::Processing;
                job.started_at = Some(current_timestamp());
                job.attempts += 1;
                
                self.processing.write().await.insert(job.id.clone(), job.clone());

                // Process job
                let result = self.process_job(job.clone()).await;

                // Remove from processing
                self.processing.write().await.remove(&job.id);

                match result {
                    Ok(_) => {
                        job.status = JobStatus::Completed;
                        job.completed_at = Some(current_timestamp());
                        info!("Job {} completed successfully", job.id);
                    }
                    Err(e) => {
                        error!("Job {} failed: {}", job.id, e);
                        job.error = Some(e.to_string());

                        // Retry logic
                        if job.attempts < job.config.max_retries {
                            job.status = JobStatus::Retrying;
                            warn!("Retrying job {} (attempt {}/{})", 
                                job.id, job.attempts + 1, job.config.max_retries);
                            
                            // Schedule retry
                            let scheduled_at = current_timestamp() + job.config.retry_delay;
                            job.config.scheduled_at = Some(scheduled_at);
                            job.status = JobStatus::Scheduled;
                            
                            self.pending.write().await.push(job.clone());
                        } else {
                            job.status = JobStatus::Failed;
                            error!("Job {} failed after {} attempts", job.id, job.attempts);
                        }
                    }
                }

                // Store in completed history
                self.completed.write().await.insert(job.id.clone(), job);
            } else {
                // No jobs available, sleep
                time::sleep(Duration::from_millis(100)).await;
            }
        }
    }

    /// Process a single job
    async fn process_job(&self, job: Job) -> Result<Bytes> {
        let handlers = self.handlers.read().await;
        
        let handler = handlers.get(&job.name)
            .ok_or_else(|| ProtocolError::Other(format!("No handler for job: {}", job.name)))?;

        // Execute with timeout
        let timeout_duration = Duration::from_millis(job.config.timeout);
        
        tokio::time::timeout(timeout_duration, async {
            handler(job)
        })
        .await
        .map_err(|_| ProtocolError::Timeout)?
    }

    /// Shutdown the queue
    pub async fn shutdown(&self) {
        info!("Shutting down job queue");
        *self.shutdown.write().await = true;
    }

    /// Clear completed jobs (cleanup)
    pub async fn clear_completed(&self) {
        self.completed.write().await.clear();
    }
}

/// Generate a unique job ID
fn generate_job_id() -> JobId {
    format!("job_{}", uuid::Uuid::new_v4())
}

/// Get current timestamp in milliseconds
fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_job_queue() {
        let queue = Arc::new(JobQueue::new(2));

        // Register handler
        queue.register("test_job".to_string(), |job| {
            Ok(Bytes::from("result"))
        }).await;

        // Enqueue job
        let job_id = queue.enqueue(
            "test_job".to_string(),
            Bytes::from("payload"),
            Default::default(),
        ).await;

        // Start processing
        queue.clone().start().await;

        // Wait a bit
        tokio::time::sleep(Duration::from_millis(500)).await;

        // Check job status
        let job = queue.get_job(&job_id).await;
        assert!(job.is_some());
    }
}


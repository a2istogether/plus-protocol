/**
 * Background Job Queue - Async Processing
 * Protocol-level job queue that works across all platforms
 */

import { EventEmitter } from 'events';

/** Job ID type */
export type JobId = string;

/** Job status */
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  SCHEDULED = 'scheduled',
}

/** Job priority */
export enum JobPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/** Job configuration */
export interface JobConfig {
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Job timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Job priority (default: NORMAL) */
  priority?: JobPriority;
  /** Scheduled time (Unix timestamp in milliseconds) */
  scheduledAt?: number;
}

/** Job definition */
export interface Job<T = any> {
  id: JobId;
  name: string;
  payload: T;
  status: JobStatus;
  config: JobConfig;
  attempts: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  result?: any;
}

/** Job handler function */
export type JobHandler<T = any, R = any> = (job: Job<T>) => Promise<R> | R;

/** Queue statistics */
export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

/**
 * Job Queue for background processing
 */
export class JobQueue extends EventEmitter {
  private jobs: Map<JobId, Job> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private processing: Set<JobId> = new Set();
  private workers: number;
  private workerPromises: Promise<void>[] = [];
  private running: boolean = false;
  private schedulerInterval?: NodeJS.Timer;

  constructor(workers: number = 4) {
    super();
    this.workers = workers;
  }

  /**
   * Register a job handler
   */
  register<T = any, R = any>(jobName: string, handler: JobHandler<T, R>): this {
    console.log(`📋 Registering job handler: ${jobName}`);
    this.handlers.set(jobName, handler);
    return this;
  }

  /**
   * Add a job to the queue
   */
  async enqueue<T = any>(
    name: string,
    payload: T,
    config: JobConfig = {}
  ): Promise<JobId> {
    const job: Job<T> = {
      id: this.generateJobId(),
      name,
      payload,
      status: config.scheduledAt ? JobStatus.SCHEDULED : JobStatus.PENDING,
      config: {
        maxRetries: config.maxRetries ?? 3,
        retryDelay: config.retryDelay ?? 1000,
        timeout: config.timeout ?? 30000,
        priority: config.priority ?? JobPriority.NORMAL,
        scheduledAt: config.scheduledAt,
      },
      attempts: 0,
      createdAt: Date.now(),
    };

    this.jobs.set(job.id, job);
    console.log(`✅ Job enqueued: ${name} (${job.id})`);
    
    this.emit('job:added', job);
    return job.id;
  }

  /**
   * Schedule a job for later execution
   */
  async schedule<T = any>(
    name: string,
    payload: T,
    delayMs: number,
    config: JobConfig = {}
  ): Promise<JobId> {
    const scheduledAt = Date.now() + delayMs;
    return this.enqueue(name, payload, {
      ...config,
      scheduledAt,
    });
  }

  /**
   * Schedule a job using cron-like syntax (simplified)
   */
  async cron<T = any>(
    name: string,
    payload: T,
    cronExpression: string,
    config: JobConfig = {}
  ): Promise<JobId> {
    // Simplified cron: '*/5 * * * *' = every 5 minutes
    const delayMs = this.parseCron(cronExpression);
    return this.schedule(name, payload, delayMs, config);
  }

  /**
   * Get job by ID
   */
  getJob(jobId: JobId): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs by status
   */
  getJobsByStatus(status: JobStatus): Job[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const jobs = Array.from(this.jobs.values());
    return {
      pending: jobs.filter(j => j.status === JobStatus.PENDING).length,
      processing: jobs.filter(j => j.status === JobStatus.PROCESSING).length,
      completed: jobs.filter(j => j.status === JobStatus.COMPLETED).length,
      failed: jobs.filter(j => j.status === JobStatus.FAILED).length,
    };
  }

  /**
   * Start processing jobs
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('⚠️  Job queue already running');
      return;
    }

    this.running = true;
    console.log(`🚀 Starting job queue with ${this.workers} workers`);

    // Start scheduler for delayed jobs
    this.startScheduler();

    // Start workers
    for (let i = 0; i < this.workers; i++) {
      this.workerPromises.push(this.runWorker(i));
    }

    this.emit('queue:started');
  }

  /**
   * Stop processing jobs
   */
  async stop(): Promise<void> {
    console.log('⏹️  Stopping job queue');
    this.running = false;

    // Stop scheduler
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }

    // Wait for workers to finish
    await Promise.all(this.workerPromises);
    this.workerPromises = [];

    this.emit('queue:stopped');
    console.log('✅ Job queue stopped');
  }

  /**
   * Clear completed jobs
   */
  clearCompleted(): void {
    const completed = this.getJobsByStatus(JobStatus.COMPLETED);
    for (const job of completed) {
      this.jobs.delete(job.id);
    }
    console.log(`🗑️  Cleared ${completed.length} completed jobs`);
  }

  /**
   * Remove a specific job
   */
  removeJob(jobId: JobId): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (this.processing.has(jobId)) {
      console.warn(`⚠️  Cannot remove job ${jobId} - currently processing`);
      return false;
    }

    this.jobs.delete(jobId);
    this.emit('job:removed', job);
    return true;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: JobId): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== JobStatus.FAILED) {
      return false;
    }

    job.status = JobStatus.PENDING;
    job.attempts = 0;
    job.error = undefined;
    
    this.emit('job:retried', job);
    return true;
  }

  /**
   * Start scheduler for delayed/scheduled jobs
   */
  private startScheduler(): void {
    this.schedulerInterval = setInterval(() => {
      const now = Date.now();
      
      for (const job of this.jobs.values()) {
        if (job.status === JobStatus.SCHEDULED && 
            job.config.scheduledAt && 
            now >= job.config.scheduledAt) {
          
          console.log(`⏰ Scheduled job ${job.id} is now ready`);
          job.status = JobStatus.PENDING;
          this.emit('job:scheduled', job);
        }
      }
    }, 100);
  }

  /**
   * Run a worker
   */
  private async runWorker(workerId: number): Promise<void> {
    console.log(`👷 Worker ${workerId} started`);

    while (this.running) {
      // Get next pending job (by priority)
      const job = this.getNextJob();

      if (job) {
        await this.processJob(job, workerId);
      } else {
        // No jobs available, sleep
        await this.sleep(100);
      }
    }

    console.log(`👷 Worker ${workerId} stopped`);
  }

  /**
   * Get next job to process (priority-based)
   */
  private getNextJob(): Job | undefined {
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => 
        job.status === JobStatus.PENDING && 
        !this.processing.has(job.id)
      )
      .sort((a, b) => {
        // Sort by priority (higher first), then by created time
        const priorityDiff = (b.config.priority ?? 0) - (a.config.priority ?? 0);
        return priorityDiff !== 0 ? priorityDiff : a.createdAt - b.createdAt;
      });

    return pendingJobs[0];
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job, workerId: number): Promise<void> {
    console.log(`⚙️  Worker ${workerId} processing job ${job.name} (${job.id})`);

    // Mark as processing
    job.status = JobStatus.PROCESSING;
    job.startedAt = Date.now();
    job.attempts++;
    this.processing.add(job.id);

    this.emit('job:started', job);

    try {
      // Get handler
      const handler = this.handlers.get(job.name);
      if (!handler) {
        throw new Error(`No handler registered for job: ${job.name}`);
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(
        () => handler(job),
        job.config.timeout!
      );

      // Job completed successfully
      job.status = JobStatus.COMPLETED;
      job.completedAt = Date.now();
      job.result = result;

      console.log(`✅ Job ${job.id} completed successfully`);
      this.emit('job:completed', job);

    } catch (error: any) {
      console.error(`❌ Job ${job.id} failed:`, error.message);
      job.error = error.message;

      // Retry logic
      if (job.attempts < (job.config.maxRetries ?? 3)) {
        job.status = JobStatus.RETRYING;
        console.log(`🔄 Retrying job ${job.id} (attempt ${job.attempts + 1}/${job.config.maxRetries})`);
        
        this.emit('job:retrying', job);

        // Schedule retry with delay
        const retryDelay = job.config.retryDelay ?? 1000;
        await this.sleep(retryDelay);
        job.status = JobStatus.PENDING;

      } else {
        job.status = JobStatus.FAILED;
        job.completedAt = Date.now();
        console.error(`❌ Job ${job.id} failed after ${job.attempts} attempts`);
        this.emit('job:failed', job);
      }
    } finally {
      this.processing.delete(job.id);
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T> | T,
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Job timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const result = await fn();
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): JobId {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Parse simplified cron expression
   */
  private parseCron(cron: string): number {
    // Simplified: '*/5 * * * *' = every 5 minutes
    // Returns delay in milliseconds
    
    const parts = cron.split(' ');
    if (parts[0].startsWith('*/')) {
      const minutes = parseInt(parts[0].substring(2));
      return minutes * 60 * 1000;
    }
    
    // Default to 1 hour
    return 60 * 60 * 1000;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a job queue instance
 */
export function createQueue(workers: number = 4): JobQueue {
  return new JobQueue(workers);
}

// Export types
export type {
  Job,
  JobHandler,
  QueueStats,
};


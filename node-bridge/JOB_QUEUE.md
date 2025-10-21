# Background Job Queue - Async Processing

**Protocol-level job queue for background/async processing** - Works across all platforms!

## 🎯 Features

✅ **Async Job Processing** - Run tasks in background  
✅ **Priority Queue** - Critical jobs run first  
✅ **Retry Logic** - Auto-retry failed jobs  
✅ **Job Scheduling** - Schedule jobs for later  
✅ **Multiple Workers** - Concurrent processing  
✅ **Timeout Support** - Prevent hanging jobs  
✅ **Event System** - Monitor job lifecycle  
✅ **Job Persistence** - Track job history  
✅ **Cron-like Scheduling** - Recurring jobs  

## 🚀 Quick Start

```javascript
const { createQueue, JobPriority } = require('fast-protocol');

// Create queue with 4 workers
const queue = createQueue(4);

// Register job handler
queue.register('send-email', async (job) => {
  const { to, subject, body } = job.payload;
  
  // Send email
  await sendEmail(to, subject, body);
  
  return { sent: true, messageId: 'msg_123' };
});

// Start processing
await queue.start();

// Enqueue job
const jobId = await queue.enqueue('send-email', {
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Thanks for signing up!'
});

console.log('Job enqueued:', jobId);
```

## 📚 API Reference

### `createQueue(workers)`

Create a new job queue.

**Parameters:**
- `workers` (number) - Number of concurrent workers (default: 4)

**Returns:** `JobQueue` instance

```javascript
const queue = createQueue(4);
```

---

### `queue.register(jobName, handler)`

Register a job handler function.

**Parameters:**
- `jobName` (string) - Unique job name
- `handler` (function) - Async function to process job

**Returns:** `this` (for chaining)

```javascript
queue.register('process-image', async (job) => {
  const { imageUrl, operations } = job.payload;
  
  // Process image
  const result = await processImage(imageUrl, operations);
  
  return result;
});
```

---

### `queue.enqueue(name, payload, config)`

Add a job to the queue.

**Parameters:**
- `name` (string) - Job name (must be registered)
- `payload` (any) - Job data
- `config` (object) - Optional configuration
  - `maxRetries` (number) - Max retry attempts (default: 3)
  - `retryDelay` (number) - Delay between retries in ms (default: 1000)
  - `timeout` (number) - Job timeout in ms (default: 30000)
  - `priority` (JobPriority) - Job priority (default: NORMAL)
  - `scheduledAt` (number) - Unix timestamp for scheduled execution

**Returns:** Promise<`JobId`>

```javascript
// Simple job
const jobId = await queue.enqueue('send-email', {
  to: 'user@example.com',
  subject: 'Hello'
});

// With configuration
const jobId = await queue.enqueue('process-video', {
  videoUrl: 'https://example.com/video.mp4'
}, {
  maxRetries: 5,
  timeout: 60000,
  priority: JobPriority.HIGH
});
```

---

### `queue.schedule(name, payload, delayMs, config)`

Schedule a job for later execution.

**Parameters:**
- `name` (string) - Job name
- `payload` (any) - Job data
- `delayMs` (number) - Delay in milliseconds
- `config` (object) - Optional configuration

**Returns:** Promise<`JobId`>

```javascript
// Run after 5 minutes
const jobId = await queue.schedule('backup-database', {
  database: 'main_db'
}, 5 * 60 * 1000);
```

---

### `queue.getJob(jobId)`

Get job by ID.

**Parameters:**
- `jobId` (string) - Job ID

**Returns:** `Job` object or `undefined`

```javascript
const job = queue.getJob(jobId);
console.log(job.status); // 'completed', 'processing', etc.
```

---

### `queue.getJobsByStatus(status)`

Get all jobs with specific status.

**Parameters:**
- `status` (JobStatus) - Job status

**Returns:** Array of `Job` objects

```javascript
const pendingJobs = queue.getJobsByStatus(JobStatus.PENDING);
const failedJobs = queue.getJobsByStatus(JobStatus.FAILED);
```

---

### `queue.getStats()`

Get queue statistics.

**Returns:** `QueueStats` object

```javascript
const stats = queue.getStats();
console.log(stats);
// {
//   pending: 5,
//   processing: 2,
//   completed: 100,
//   failed: 3
// }
```

---

### `queue.start()`

Start processing jobs.

**Returns:** Promise<void>

```javascript
await queue.start();
```

---

### `queue.stop()`

Stop processing jobs (waits for current jobs to finish).

**Returns:** Promise<void>

```javascript
await queue.stop();
```

---

### `queue.clearCompleted()`

Remove all completed jobs from history.

**Returns:** void

```javascript
queue.clearCompleted();
```

---

### `queue.retryJob(jobId)`

Retry a failed job.

**Parameters:**
- `jobId` (string) - Job ID

**Returns:** Promise<boolean>

```javascript
const retried = await queue.retryJob(jobId);
```

---

## 🔥 Events

The queue emits events for job lifecycle monitoring:

```javascript
queue.on('job:added', (job) => {
  console.log('Job added:', job.id);
});

queue.on('job:started', (job) => {
  console.log('Job started:', job.id);
});

queue.on('job:completed', (job) => {
  console.log('Job completed:', job.id);
  console.log('Result:', job.result);
});

queue.on('job:failed', (job) => {
  console.error('Job failed:', job.id);
  console.error('Error:', job.error);
});

queue.on('job:retrying', (job) => {
  console.log('Job retrying:', job.id);
  console.log('Attempt:', job.attempts);
});

queue.on('queue:started', () => {
  console.log('Queue started');
});

queue.on('queue:stopped', () => {
  console.log('Queue stopped');
});
```

---

## 📦 Job Object

```typescript
interface Job {
  id: string;                // Unique job ID
  name: string;              // Job name
  payload: any;              // Job data
  status: JobStatus;         // Current status
  config: JobConfig;         // Job configuration
  attempts: number;          // Number of attempts
  createdAt: number;         // Creation timestamp
  startedAt?: number;        // Start timestamp
  completedAt?: number;      // Completion timestamp
  error?: string;            // Error message (if failed)
  result?: any;              // Result data (if completed)
}
```

---

## 🎯 Job Priority

```javascript
JobPriority.LOW       // 0
JobPriority.NORMAL    // 1 (default)
JobPriority.HIGH      // 2
JobPriority.CRITICAL  // 3
```

Higher priority jobs are processed first.

---

## 🎨 Use Cases

### 1. Email Sending

```javascript
queue.register('send-email', async (job) => {
  const { to, subject, body } = job.payload;
  await emailService.send(to, subject, body);
  return { sent: true };
});

// Usage
await queue.enqueue('send-email', {
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Thanks for signing up!'
});
```

### 2. Image Processing

```javascript
queue.register('process-image', async (job) => {
  const { imageUrl, operations } = job.payload;
  
  let result = await downloadImage(imageUrl);
  
  for (const op of operations) {
    result = await applyOperation(result, op);
  }
  
  return await uploadProcessed(result);
}, {
  timeout: 60000 // 1 minute
});
```

### 3. Report Generation

```javascript
queue.register('generate-report', async (job) => {
  const { type, filters, userId } = job.payload;
  
  const data = await fetchData(filters);
  const report = await generatePDF(data);
  const url = await uploadReport(report);
  
  return { reportUrl: url, recordCount: data.length };
}, {
  priority: JobPriority.LOW
});
```

### 4. Database Backup

```javascript
queue.register('backup-database', async (job) => {
  const { database, destination } = job.payload;
  
  await createBackup(database, destination);
  
  return { backupFile: `${destination}/backup.sql` };
});

// Schedule daily backup
await queue.schedule('backup-database', {
  database: 'main_db',
  destination: '/backups'
}, 24 * 60 * 60 * 1000); // 24 hours
```

---

## 🌐 API Integration

```javascript
const { Server, createQueue } = require('fast-protocol');

const app = new Server();
const queue = createQueue(4);

// Register handlers
queue.register('process-upload', async (job) => {
  // Process file
  return { processedUrl: '...' };
});

await queue.start();

// API endpoint
app.post('/upload', async (req, res) => {
  // Enqueue background job
  const jobId = await queue.enqueue('process-upload', {
    file: req.file
  });
  
  // Respond immediately
  res.status(202).json({
    message: 'Upload processing',
    jobId,
    checkStatus: `/jobs/${jobId}`
  });
});

// Check job status
app.get('/jobs/:jobId', (req, res) => {
  const job = queue.getJob(req.params.jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json({ 
    status: job.status, 
    result: job.result 
  });
});
```

---

## ⚙️ Best Practices

### 1. Idempotent Jobs
Make jobs idempotent (safe to retry):
```javascript
queue.register('update-user', async (job) => {
  const { userId, data } = job.payload;
  
  // Check if already updated
  const user = await getUser(userId);
  if (user.lastUpdate === data.timestamp) {
    return { skipped: true };
  }
  
  await updateUser(userId, data);
  return { updated: true };
});
```

### 2. Error Handling
Always handle errors properly:
```javascript
queue.register('risky-job', async (job) => {
  try {
    const result = await riskyOperation(job.payload);
    return result;
  } catch (error) {
    console.error('Job failed:', error);
    throw error; // Re-throw for retry logic
  }
});
```

### 3. Progress Tracking
Track long-running jobs:
```javascript
queue.register('long-job', async (job) => {
  const total = 100;
  
  for (let i = 0; i < total; i++) {
    await processItem(i);
    
    // Update progress (emit event)
    queue.emit('job:progress', { 
      jobId: job.id, 
      progress: (i / total) * 100 
    });
  }
  
  return { completed: total };
});
```

### 4. Resource Cleanup
Clean up resources:
```javascript
queue.register('cleanup-job', async (job) => {
  let resource;
  
  try {
    resource = await acquireResource();
    return await useResource(resource);
  } finally {
    if (resource) {
      await releaseResource(resource);
    }
  }
});
```

---

## 📊 Monitoring

```javascript
// Monitor queue health
setInterval(() => {
  const stats = queue.getStats();
  
  if (stats.failed > 10) {
    console.warn('Too many failed jobs!');
  }
  
  if (stats.pending > 1000) {
    console.warn('Queue backlog growing!');
  }
}, 60000);

// Log job lifecycle
queue.on('job:completed', (job) => {
  const duration = job.completedAt - job.startedAt;
  console.log(`Job ${job.name} completed in ${duration}ms`);
});
```

---

## 🚀 Production Tips

1. **Worker Count**: Set based on CPU cores and I/O
   ```javascript
   const workers = require('os').cpus().length;
   const queue = createQueue(workers);
   ```

2. **Timeouts**: Set appropriate timeouts
   ```javascript
   const config = {
     timeout: 30000,  // 30 seconds for normal jobs
     maxRetries: 3
   };
   ```

3. **Cleanup**: Regularly clear completed jobs
   ```javascript
   setInterval(() => {
     queue.clearCompleted();
   }, 60 * 60 * 1000); // Every hour
   ```

4. **Graceful Shutdown**: Stop queue on exit
   ```javascript
   process.on('SIGINT', async () => {
     await queue.stop();
     process.exit(0);
   });
   ```

---

## 📦 Examples

See the `examples/` directory:
- `job-queue-example.js` - Standalone job queue
- `api-with-jobs.js` - API + job queue integration

Run examples:
```bash
npm run build
node examples/job-queue-example.js
node examples/api-with-jobs.js
```

---

**Built into the protocol - Works everywhere!** 🚀


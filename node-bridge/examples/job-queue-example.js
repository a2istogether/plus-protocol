/**
 * Background Job Queue Example
 * Shows how to use async job processing at protocol level
 */

const { createQueue, JobPriority, JobStatus } = require('../dist/index');

// ===== Job Handlers =====

// Email sending job
async function sendEmailJob(job) {
  const { to, subject, body } = job.payload;
  
  console.log(`📧 Sending email to ${to}`);
  console.log(`   Subject: ${subject}`);
  
  // Simulate email sending
  await sleep(1000);
  
  return { sent: true, messageId: `msg_${Date.now()}` };
}

// Image processing job
async function processImageJob(job) {
  const { imageUrl, operations } = job.payload;
  
  console.log(`🖼️  Processing image: ${imageUrl}`);
  console.log(`   Operations: ${operations.join(', ')}`);
  
  // Simulate image processing
  await sleep(2000);
  
  return { processedUrl: `${imageUrl}_processed`, operations };
}

// Data export job (long-running)
async function exportDataJob(job) {
  const { format, filters } = job.payload;
  
  console.log(`📊 Exporting data to ${format}`);
  
  // Simulate long export
  for (let i = 0; i < 5; i++) {
    console.log(`   Progress: ${(i + 1) * 20}%`);
    await sleep(500);
  }
  
  return { 
    fileUrl: `/exports/data_${Date.now()}.${format}`,
    recordCount: 1000 
  };
}

// Report generation job
async function generateReportJob(job) {
  const { reportType, dateRange } = job.payload;
  
  console.log(`📄 Generating ${reportType} report`);
  console.log(`   Date range: ${dateRange.from} to ${dateRange.to}`);
  
  await sleep(1500);
  
  return {
    reportId: `report_${Date.now()}`,
    url: `/reports/${reportType}_report.pdf`
  };
}

// Notification job
async function sendNotificationJob(job) {
  const { userId, message, type } = job.payload;
  
  console.log(`🔔 Sending ${type} notification to user ${userId}`);
  console.log(`   Message: ${message}`);
  
  await sleep(500);
  
  return { notified: true };
}

// Database backup job
async function backupDatabaseJob(job) {
  const { database, destination } = job.payload;
  
  console.log(`💾 Backing up database: ${database}`);
  
  await sleep(3000);
  
  return {
    backupFile: `${destination}/backup_${Date.now()}.sql`,
    size: '1.2GB'
  };
}

// ===== Main Example =====

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   ⚙️  Background Job Queue Example            ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // Create job queue with 3 workers
  const queue = createQueue(3);

  // Register job handlers
  console.log('📋 Registering job handlers...\n');
  
  queue.register('send-email', sendEmailJob);
  queue.register('process-image', processImageJob);
  queue.register('export-data', exportDataJob);
  queue.register('generate-report', generateReportJob);
  queue.register('send-notification', sendNotificationJob);
  queue.register('backup-database', backupDatabaseJob);

  // Listen to events
  queue.on('job:added', (job) => {
    console.log(`✅ Job added: ${job.name} (${job.id})`);
  });

  queue.on('job:started', (job) => {
    console.log(`⚙️  Job started: ${job.name} (${job.id})`);
  });

  queue.on('job:completed', (job) => {
    console.log(`✅ Job completed: ${job.name} (${job.id})`);
    console.log(`   Result:`, job.result);
    console.log(`   Time: ${job.completedAt - job.startedAt}ms\n`);
  });

  queue.on('job:failed', (job) => {
    console.error(`❌ Job failed: ${job.name} (${job.id})`);
    console.error(`   Error: ${job.error}\n`);
  });

  queue.on('job:retrying', (job) => {
    console.log(`🔄 Job retrying: ${job.name} (${job.id})`);
    console.log(`   Attempt: ${job.attempts + 1}/${job.config.maxRetries}\n`);
  });

  // Start the queue
  console.log('🚀 Starting queue...\n');
  await queue.start();

  // ===== 1. Immediate Jobs =====
  console.log('\n📋 Adding immediate jobs...\n');

  await queue.enqueue('send-email', {
    to: 'user@example.com',
    subject: 'Welcome!',
    body: 'Thanks for signing up!'
  });

  await queue.enqueue('send-notification', {
    userId: 123,
    message: 'Your order has shipped',
    type: 'push'
  }, {
    priority: JobPriority.HIGH
  });

  await queue.enqueue('process-image', {
    imageUrl: 'https://example.com/image.jpg',
    operations: ['resize', 'compress', 'watermark']
  });

  // ===== 2. Priority Jobs =====
  console.log('🔥 Adding priority jobs...\n');

  await queue.enqueue('generate-report', {
    reportType: 'sales',
    dateRange: { from: '2024-01-01', to: '2024-01-31' }
  }, {
    priority: JobPriority.CRITICAL
  });

  // ===== 3. Scheduled Jobs =====
  console.log('⏰ Scheduling delayed jobs...\n');

  const scheduledId = await queue.schedule('backup-database', {
    database: 'main_db',
    destination: '/backups'
  }, 5000); // Run after 5 seconds

  console.log(`   Scheduled backup job: ${scheduledId}`);

  // ===== 4. Batch Jobs =====
  console.log('\n📦 Adding batch jobs...\n');

  const emailIds = [];
  for (let i = 1; i <= 5; i++) {
    const jobId = await queue.enqueue('send-email', {
      to: `user${i}@example.com`,
      subject: `Newsletter #${i}`,
      body: 'Check out our latest updates!'
    }, {
      priority: JobPriority.LOW
    });
    emailIds.push(jobId);
  }

  console.log(`   Added ${emailIds.length} email jobs\n`);

  // ===== 5. Long-running Job =====
  await queue.enqueue('export-data', {
    format: 'csv',
    filters: { status: 'active', date: '2024-01-01' }
  }, {
    timeout: 10000 // 10 second timeout
  });

  // ===== Monitor Queue =====
  const statsInterval = setInterval(() => {
    const stats = queue.getStats();
    console.log(`\n📊 Queue Stats:`);
    console.log(`   Pending: ${stats.pending}`);
    console.log(`   Processing: ${stats.processing}`);
    console.log(`   Completed: ${stats.completed}`);
    console.log(`   Failed: ${stats.failed}`);
  }, 3000);

  // ===== Wait and cleanup =====
  await sleep(15000);

  clearInterval(statsInterval);

  // Final stats
  console.log('\n' + '='.repeat(50));
  const finalStats = queue.getStats();
  console.log('\n📊 Final Statistics:');
  console.log(`   Total Jobs: ${finalStats.pending + finalStats.processing + finalStats.completed + finalStats.failed}`);
  console.log(`   Completed: ${finalStats.completed}`);
  console.log(`   Failed: ${finalStats.failed}`);
  console.log(`   Still Processing: ${finalStats.processing}`);
  console.log(`   Pending: ${finalStats.pending}\n`);

  // Show specific job details
  console.log('🔍 Job Details:\n');
  const completedJobs = queue.getJobsByStatus(JobStatus.COMPLETED);
  completedJobs.slice(0, 3).forEach(job => {
    console.log(`   ${job.name} (${job.id})`);
    console.log(`     Status: ${job.status}`);
    console.log(`     Attempts: ${job.attempts}`);
    console.log(`     Duration: ${job.completedAt! - job.startedAt!}ms`);
  });

  // Clear completed jobs
  console.log('\n🗑️  Clearing completed jobs...');
  queue.clearCompleted();
  
  // Stop queue
  console.log('⏹️  Stopping queue...\n');
  await queue.stop();

  console.log('✅ Done!\n');
}

// Helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run
main().catch(console.error);


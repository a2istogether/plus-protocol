/**
 * API Server with Background Job Queue Integration
 * Real-world example: User uploads image → API returns immediately → Image processed in background
 */

const { 
  Server, 
  createQueue,
  JobPriority,
  logger, 
  json,
  multipart,
  cors 
} = require('../dist/index');

// ===== Job Handlers =====

async function processImageJob(job) {
  const { filename, operations, userId } = job.payload;
  
  console.log(`🖼️  [Job] Processing image for user ${userId}: ${filename}`);
  
  // Simulate image processing
  await sleep(3000);
  
  return {
    originalUrl: `/uploads/${filename}`,
    processedUrl: `/uploads/processed_${filename}`,
    operations,
    processedAt: new Date().toISOString()
  };
}

async function sendWelcomeEmailJob(job) {
  const { email, name } = job.payload;
  
  console.log(`📧 [Job] Sending welcome email to ${email}`);
  
  // Simulate email sending
  await sleep(1000);
  
  return {
    sent: true,
    to: email,
    messageId: `msg_${Date.now()}`
  };
}

async function generateInvoiceJob(job) {
  const { orderId, userId, items } = job.payload;
  
  console.log(`🧾 [Job] Generating invoice for order ${orderId}`);
  
  // Simulate invoice generation
  await sleep(2000);
  
  return {
    invoiceId: `inv_${Date.now()}`,
    orderId,
    pdfUrl: `/invoices/${orderId}.pdf`,
    generatedAt: new Date().toISOString()
  };
}

async function exportReportJob(job) {
  const { reportType, filters, userId } = job.payload;
  
  console.log(`📊 [Job] Exporting ${reportType} report for user ${userId}`);
  
  // Simulate report generation
  await sleep(5000);
  
  return {
    reportId: `report_${Date.now()}`,
    type: reportType,
    downloadUrl: `/exports/report_${Date.now()}.csv`,
    recordCount: 1500
  };
}

// ===== Main Application =====

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🚀 API Server + Job Queue Integration       ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // Create API server
  const app = new Server();
  
  // Create job queue
  const queue = createQueue(4);

  // Register job handlers
  queue.register('process-image', processImageJob);
  queue.register('send-welcome-email', sendWelcomeEmailJob);
  queue.register('generate-invoice', generateInvoiceJob);
  queue.register('export-report', exportReportJob);

  // Start queue
  await queue.start();

  // Middleware
  app.use(logger());
  app.use(json());
  app.use(cors());

  // ===== API Routes =====

  // Health check
  app.get('/health', (req, res) => {
    const stats = queue.getStats();
    res.json({
      status: 'ok',
      queue: stats,
      uptime: process.uptime()
    });
  });

  // ===== 1. Image Upload with Background Processing =====
  app.post('/api/images/upload',
    multipart({ limits: { fileSize: 10 * 1024 * 1024 } }),
    async (req, res) => {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: 'No file uploaded' 
        });
      }

      const { operations } = req.body;
      const filename = req.file.originalname;

      console.log(`📤 [API] Image upload received: ${filename}`);

      // Enqueue background job
      const jobId = await queue.enqueue('process-image', {
        filename,
        operations: operations ? operations.split(',') : ['resize', 'compress'],
        userId: 123
      }, {
        priority: JobPriority.HIGH
      });

      // Respond immediately
      res.status(202).json({
        success: true,
        message: 'Image uploaded. Processing in background.',
        jobId,
        filename,
        checkStatus: `/api/jobs/${jobId}`
      });
    }
  );

  // ===== 2. User Registration with Welcome Email =====
  app.post('/api/auth/register', async (req, res) => {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, name, and password required'
      });
    }

    console.log(`👤 [API] User registration: ${email}`);

    // Create user (simulate)
    const userId = Date.now();

    // Enqueue welcome email (background)
    const jobId = await queue.enqueue('send-welcome-email', {
      email,
      name,
      userId
    }, {
      priority: JobPriority.NORMAL,
      maxRetries: 5
    });

    // Respond immediately
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: { id: userId, email, name },
      welcomeEmailJobId: jobId
    });
  });

  // ===== 3. Order Placement with Invoice Generation =====
  app.post('/api/orders', async (req, res) => {
    const { items, userId } = req.body;

    if (!items || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Items and userId required'
      });
    }

    const orderId = `order_${Date.now()}`;

    console.log(`🛒 [API] Order placed: ${orderId}`);

    // Enqueue invoice generation (background)
    const jobId = await queue.enqueue('generate-invoice', {
      orderId,
      userId,
      items
    }, {
      priority: JobPriority.HIGH
    });

    // Respond immediately
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: {
        id: orderId,
        items,
        status: 'processing'
      },
      invoiceJobId: jobId
    });
  });

  // ===== 4. Report Export (Long-running) =====
  app.post('/api/reports/export', async (req, res) => {
    const { type, filters } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Report type required'
      });
    }

    console.log(`📊 [API] Report export requested: ${type}`);

    // Enqueue export job
    const jobId = await queue.enqueue('export-report', {
      reportType: type,
      filters: filters || {},
      userId: 123
    }, {
      priority: JobPriority.LOW,
      timeout: 30000 // 30 seconds
    });

    // Respond immediately
    res.status(202).json({
      success: true,
      message: 'Report export started',
      jobId,
      checkStatus: `/api/jobs/${jobId}`
    });
  });

  // ===== 5. Scheduled Job (Cron-like) =====
  app.post('/api/admin/schedule-backup', async (req, res) => {
    const { delayMinutes } = req.body;
    const delayMs = (delayMinutes || 60) * 60 * 1000;

    // Schedule backup job
    const jobId = await queue.schedule('backup-database', {
      database: 'main_db',
      destination: '/backups'
    }, delayMs);

    res.json({
      success: true,
      message: `Backup scheduled for ${delayMinutes || 60} minutes from now`,
      jobId
    });
  });

  // ===== Job Status Endpoint =====
  app.get('/api/jobs/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = queue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        name: job.name,
        status: job.status,
        attempts: job.attempts,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        result: job.result,
        error: job.error,
        progress: getJobProgress(job)
      }
    });
  });

  // ===== Queue Management Endpoints =====
  
  // Get all jobs
  app.get('/api/admin/jobs', (req, res) => {
    const { status } = req.query;
    
    let jobs;
    if (status) {
      jobs = queue.getJobsByStatus(status);
    } else {
      const stats = queue.getStats();
      jobs = {
        stats,
        pending: queue.getJobsByStatus('pending').slice(0, 10),
        processing: queue.getJobsByStatus('processing'),
        recent: queue.getJobsByStatus('completed').slice(-10)
      };
    }

    res.json({ success: true, jobs });
  });

  // Retry failed job
  app.post('/api/admin/jobs/:jobId/retry', async (req, res) => {
    const { jobId } = req.params;
    const retried = await queue.retryJob(jobId);

    if (!retried) {
      return res.status(400).json({
        success: false,
        error: 'Cannot retry job (not found or not failed)'
      });
    }

    res.json({
      success: true,
      message: 'Job queued for retry'
    });
  });

  // Clear completed jobs
  app.post('/api/admin/jobs/clear-completed', (req, res) => {
    queue.clearCompleted();
    res.json({
      success: true,
      message: 'Completed jobs cleared'
    });
  });

  // Queue statistics
  app.get('/api/admin/queue/stats', (req, res) => {
    const stats = queue.getStats();
    res.json({
      success: true,
      stats
    });
  });

  // ===== Start Server =====
  await app.listen(8080, () => {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   🚀 Server running on port 8080              ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    console.log('📋 Available Endpoints:\n');
    console.log('  Health & Stats:');
    console.log('    GET  /health');
    console.log('    GET  /api/admin/queue/stats');
    console.log('');
    console.log('  User Actions (Background Jobs):');
    console.log('    POST /api/images/upload        - Upload & process image');
    console.log('    POST /api/auth/register         - Register with welcome email');
    console.log('    POST /api/orders                - Place order with invoice');
    console.log('    POST /api/reports/export        - Export large report');
    console.log('');
    console.log('  Job Management:');
    console.log('    GET  /api/jobs/:jobId           - Check job status');
    console.log('    GET  /api/admin/jobs            - List all jobs');
    console.log('    POST /api/admin/jobs/:jobId/retry - Retry failed job');
    console.log('    POST /api/admin/jobs/clear-completed - Clear history');
    console.log('');
    console.log('💡 Test Commands:\n');
    console.log('  # Register user (sends welcome email in background)');
    console.log('  curl -X POST http://localhost:8080/api/auth/register \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"email":"user@example.com","name":"John","password":"secret"}\'');
    console.log('');
    console.log('  # Export report (long-running job)');
    console.log('  curl -X POST http://localhost:8080/api/reports/export \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"type":"sales","filters":{"year":2024}}\'');
    console.log('');
    console.log('  # Check job status');
    console.log('  curl http://localhost:8080/api/jobs/JOB_ID');
    console.log('');
    console.log('  # Queue stats');
    console.log('  curl http://localhost:8080/api/admin/queue/stats');
    console.log('');
  });
}

// Helpers
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getJobProgress(job) {
  if (job.status === 'completed') return 100;
  if (job.status === 'processing') {
    const elapsed = Date.now() - (job.startedAt || job.createdAt);
    const timeout = job.config.timeout || 30000;
    return Math.min(95, Math.floor((elapsed / timeout) * 100));
  }
  return 0;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⏹️  Shutting down gracefully...');
  process.exit(0);
});

main().catch(console.error);


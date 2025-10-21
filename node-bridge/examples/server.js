/**
 * Example server - Express.js style API
 */

const { 
  Server, 
  Router,
  logger, 
  json, 
  cors,
  rateLimit,
  errorHandler 
} = require('../dist/index');

// ===== Controllers (like Express) =====

// User controller
const userController = {
  getUser: async (req, res) => {
    res.json({
      id: 1,
      name: 'John Doe',
      email: 'john@example.com'
    });
  },
  
  createUser: async (req, res) => {
    const { name, email } = req.body;
    console.log('Creating user:', { name, email });
    
    res.status(201).json({
      id: Date.now(),
      name,
      email,
      createdAt: new Date().toISOString()
    });
  },
  
  updateUser: async (req, res) => {
    const { name, email } = req.body;
    console.log('Updating user:', { name, email });
    
    res.json({
      id: 1,
      name,
      email,
      updatedAt: new Date().toISOString()
    });
  }
};

// API controller
const apiController = {
  ping: (req, res) => {
    console.log('Ping received from', req.ip);
    res.text('pong');
  },
  
  echo: (req, res) => {
    const message = req.body;
    console.log('Echo:', message);
    res.send(message);
  },
  
  uppercase: (req, res) => {
    const text = req.text();
    res.send(text.toUpperCase());
  },
  
  reverse: (req, res) => {
    const text = req.text();
    const reversed = text.split('').reverse().join('');
    res.send(reversed);
  }
};

// ===== Middleware (Custom) =====

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  const token = req.get('Authorization');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  // Simulate token validation
  if (token !== 'Bearer valid-token') {
    return res.status(403).json({ error: 'Invalid token' });
  }
  
  req.user = { id: 1, name: 'Authenticated User' };
  next();
};

// Request timing middleware
const timingMiddleware = async (req, res, next) => {
  const start = Date.now();
  
  await next();
  
  const duration = Date.now() - start;
  res.set('X-Response-Time', `${duration}ms`);
};

// ===== Routes Setup =====

async function main() {
  // Create server (like Express)
  const server = new Server({
    ackTimeout: 1000,
    maxRetransmit: 3,
    heartbeatInterval: 30000,
  });

  // ===== Global Middleware =====
  server.use(logger());              // Logging
  server.use(json());                // Body parser
  server.use(cors());                // CORS
  server.use(timingMiddleware);      // Custom timing

  // ===== Public Routes =====
  
  server.get('/ping', apiController.ping);
  
  server.post('/echo', apiController.echo);
  
  server.post('/uppercase', apiController.uppercase);
  
  server.post('/reverse', apiController.reverse);
  
  // JSON endpoint
  server.post('/json', (req, res) => {
    const data = req.body;
    console.log('Received JSON:', data);
    
    res.json({
      message: 'Received',
      echo: data,
      timestamp: Date.now(),
      receivedAt: new Date().toISOString()
    });
  });
  
  // ===== Protected Routes (with auth) =====
  
  server.get('/user', authMiddleware, userController.getUser);
  
  server.post('/user', authMiddleware, userController.createUser);
  
  server.put('/user', authMiddleware, userController.updateUser);
  
  // ===== Router Example (like Express Router) =====
  
  const apiRouter = new Router();
  
  // Router middleware
  apiRouter.use(rateLimit({ max: 100, windowMs: 60000 }));
  
  // Router routes
  apiRouter.get('/status', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now()
    });
  });
  
  apiRouter.get('/health', (req, res) => {
    res.json({
      healthy: true,
      version: '1.0.0'
    });
  });
  
  apiRouter.post('/data', (req, res) => {
    res.json({
      received: req.body,
      processed: true
    });
  });
  
  // Mount router
  server.use(apiRouter);
  
  // ===== Error Handling =====
  
  // Custom error handler
  server.use((err, req, res, next) => {
    console.error('Error occurred:', err.message);
    
    if (err.message.includes('unauthorized')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });
  
  // ===== Start Server =====
  
  await server.listen(8080, () => {
    console.log('🚀 Server is running!');
    console.log('');
    console.log('📋 Available routes:');
    console.log('  Public Routes:');
    console.log('    GET  /ping           - Simple ping/pong');
    console.log('    POST /echo           - Echo message');
    console.log('    POST /json           - JSON endpoint');
    console.log('    POST /uppercase      - Convert to uppercase');
    console.log('    POST /reverse        - Reverse string');
    console.log('');
    console.log('  Protected Routes (need Authorization header):');
    console.log('    GET  /user           - Get user info');
    console.log('    POST /user           - Create user');
    console.log('    PUT  /user           - Update user');
    console.log('');
    console.log('  API Routes:');
    console.log('    GET  /status         - Server status');
    console.log('    GET  /health         - Health check');
    console.log('    POST /data           - Process data');
    console.log('');
    console.log('💡 Example requests:');
    console.log('  Public: No auth needed');
    console.log('  Protected: Add header "Authorization: Bearer valid-token"');
  });
}

main().catch(console.error);


/**
 * Advanced Express-style Server Example
 * Shows MVC pattern, route organization, and best practices
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

// ===== Controllers =====

// products.controller.js
const productsController = {
  // GET /products
  getAll: async (req, res, next) => {
    try {
      const products = [
        { id: 1, name: 'Laptop', price: 999 },
        { id: 2, name: 'Mouse', price: 29 },
        { id: 3, name: 'Keyboard', price: 79 },
      ];
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  },

  // GET /products/:id
  getById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const product = { id, name: 'Sample Product', price: 99 };
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  },

  // POST /products
  create: async (req, res, next) => {
    try {
      const { name, price } = req.body;
      
      // Validation
      if (!name || !price) {
        return res.status(400).json({ 
          success: false, 
          error: 'Name and price are required' 
        });
      }

      const newProduct = { 
        id: Date.now(), 
        name, 
        price, 
        createdAt: new Date().toISOString() 
      };
      
      res.status(201).json({ success: true, data: newProduct });
    } catch (error) {
      next(error);
    }
  },

  // PUT /products/:id
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, price } = req.body;
      
      const updatedProduct = { 
        id, 
        name, 
        price, 
        updatedAt: new Date().toISOString() 
      };
      
      res.json({ success: true, data: updatedProduct });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /products/:id
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      res.json({ success: true, message: `Product ${id} deleted` });
    } catch (error) {
      next(error);
    }
  }
};

// users.controller.js
const usersController = {
  getProfile: async (req, res, next) => {
    try {
      // req.user added by auth middleware
      res.json({ 
        success: true, 
        data: req.user 
      });
    } catch (error) {
      next(error);
    }
  },

  updateProfile: async (req, res, next) => {
    try {
      const updates = req.body;
      const updated = { ...req.user, ...updates };
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },

  changePassword: async (req, res, next) => {
    try {
      const { oldPassword, newPassword } = req.body;
      
      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Old and new passwords required'
        });
      }

      res.json({ 
        success: true, 
        message: 'Password changed successfully' 
      });
    } catch (error) {
      next(error);
    }
  }
};

// ===== Middleware =====

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.get('Authorization');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Simulate token validation
    if (token.startsWith('Bearer ')) {
      const tokenValue = token.substring(7);
      
      if (tokenValue === 'valid-token') {
        req.user = {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin'
        };
        return next();
      }
    }

    res.status(403).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  } catch (error) {
    next(error);
  }
};

// Authorization middleware (role-based)
const authorize = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Validation middleware
const validate = (schema) => {
  return async (req, res, next) => {
    try {
      // Simple validation example
      if (schema.requireBody && !req.body) {
        return res.status(400).json({
          success: false,
          error: 'Request body required'
        });
      }

      if (schema.requiredFields) {
        for (const field of schema.requiredFields) {
          if (!req.body[field]) {
            return res.status(400).json({
              success: false,
              error: `Field '${field}' is required`
            });
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Request ID middleware
const requestId = async (req, res, next) => {
  req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.set('X-Request-ID', req.id);
  next();
};

// Cache middleware
const cache = (duration = 60000) => {
  const cache = new Map();
  
  return async (req, res, next) => {
    const key = req.route;
    const cached = cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < duration) {
      res.set('X-Cache', 'HIT');
      return res.send(cached.data);
    }

    // Override res.send to cache response
    const originalSend = res.send.bind(res);
    res.send = function(data) {
      cache.set(key, { data, timestamp: Date.now() });
      res.set('X-Cache', 'MISS');
      originalSend(data);
    };

    next();
  };
};

// ===== Routes Setup =====

async function main() {
  const app = new Server();

  // ===== Global Middleware =====
  app.use(requestId);                    // Request ID
  app.use(logger());                     // Logging
  app.use(json());                       // Body parser
  app.use(cors({                         // CORS
    origin: '*',
    methods: 'GET,POST,PUT,DELETE',
    headers: 'Content-Type,Authorization'
  }));

  // ===== Public API Router =====
  const publicRouter = new Router();

  publicRouter.get('/health', (req, res) => {
    res.json({ 
      success: true, 
      status: 'healthy', 
      timestamp: Date.now() 
    });
  });

  publicRouter.post('/ping', (req, res) => {
    res.json({ 
      success: true, 
      message: 'pong', 
      timestamp: Date.now() 
    });
  });

  app.use(publicRouter);

  // ===== Products API Router (Protected) =====
  const productsRouter = new Router();
  
  // Apply rate limiting to products routes
  productsRouter.use(rateLimit({ max: 100, windowMs: 60000 }));
  
  // Public product routes
  productsRouter.get('/products', cache(30000), productsController.getAll);
  productsRouter.get('/products/:id', cache(30000), productsController.getById);
  
  // Protected product routes (admin only)
  productsRouter.post('/products', 
    authenticate, 
    authorize('admin'), 
    validate({ requireBody: true, requiredFields: ['name', 'price'] }),
    productsController.create
  );
  
  productsRouter.put('/products/:id', 
    authenticate, 
    authorize('admin'),
    productsController.update
  );
  
  productsRouter.delete('/products/:id', 
    authenticate, 
    authorize('admin'),
    productsController.delete
  );

  app.use(productsRouter);

  // ===== Users API Router (Protected) =====
  const usersRouter = new Router();
  
  // All user routes require authentication
  usersRouter.use(authenticate);
  
  usersRouter.get('/user/profile', usersController.getProfile);
  
  usersRouter.put('/user/profile', 
    validate({ requireBody: true }),
    usersController.updateProfile
  );
  
  usersRouter.post('/user/change-password', 
    validate({ requireBody: true, requiredFields: ['oldPassword', 'newPassword'] }),
    usersController.changePassword
  );

  app.use(usersRouter);

  // ===== Analytics Router =====
  const analyticsRouter = new Router();
  
  analyticsRouter.use(authenticate);
  analyticsRouter.use(authorize('admin'));
  
  analyticsRouter.get('/analytics/overview', (req, res) => {
    res.json({
      success: true,
      data: {
        totalUsers: 1234,
        totalProducts: 56,
        totalOrders: 789,
        revenue: 45678.90
      }
    });
  });
  
  analyticsRouter.get('/analytics/sales', (req, res) => {
    res.json({
      success: true,
      data: {
        today: 1234,
        week: 8765,
        month: 34567
      }
    });
  });

  app.use(analyticsRouter);

  // ===== Error Handling =====
  
  // 404 handler
  app.use((req, res, next) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      path: req.route
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error(`[${req.id}] Error:`, err.message);
    
    const statusCode = err.statusCode || 500;
    
    res.status(statusCode).json({
      success: false,
      error: err.message || 'Internal Server Error',
      requestId: req.id,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack 
      })
    });
  });

  // ===== Start Server =====
  
  await app.listen(8080, () => {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   🚀 Fast Protocol Server (Express Style)    ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log('📍 Server running at: 127.0.0.1:8080');
    console.log('');
    console.log('📋 Available Routes:');
    console.log('');
    console.log('  🌐 Public Routes:');
    console.log('     GET  /health              - Health check');
    console.log('     POST /ping                - Ping/pong');
    console.log('');
    console.log('  📦 Products (Public):');
    console.log('     GET  /products            - Get all products (cached)');
    console.log('     GET  /products/:id        - Get product by ID (cached)');
    console.log('');
    console.log('  📦 Products (Admin Only):');
    console.log('     POST   /products          - Create product');
    console.log('     PUT    /products/:id      - Update product');
    console.log('     DELETE /products/:id      - Delete product');
    console.log('');
    console.log('  👤 User (Authenticated):');
    console.log('     GET  /user/profile        - Get user profile');
    console.log('     PUT  /user/profile        - Update profile');
    console.log('     POST /user/change-password - Change password');
    console.log('');
    console.log('  📊 Analytics (Admin Only):');
    console.log('     GET  /analytics/overview  - Analytics overview');
    console.log('     GET  /analytics/sales     - Sales analytics');
    console.log('');
    console.log('🔐 Authentication:');
    console.log('   Header: Authorization: Bearer valid-token');
    console.log('');
    console.log('💡 Features Demonstrated:');
    console.log('   ✅ MVC Pattern (Controllers)');
    console.log('   ✅ Routers');
    console.log('   ✅ Authentication & Authorization');
    console.log('   ✅ Validation');
    console.log('   ✅ Rate Limiting');
    console.log('   ✅ Caching');
    console.log('   ✅ Error Handling');
    console.log('   ✅ Request IDs');
    console.log('   ✅ CORS');
    console.log('');
  });
}

main().catch(console.error);


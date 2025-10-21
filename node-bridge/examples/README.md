# Fast Protocol Examples (Express-style)

Production-ready examples showing how to use Fast Protocol with Express.js patterns.

## 🚀 Quick Start

### Basic Server

```javascript
const { Server } = require('fast-protocol');

const app = new Server();

app.get('/hello', (req, res) => {
  res.send('Hello, World!');
});

await app.listen(8080);
```

## 📁 Examples

### 1. `server.js` - Express-style Server

Complete server example with:
- ✅ Controllers
- ✅ Custom middleware
- ✅ Router
- ✅ Authentication
- ✅ Error handling

```bash
npm run build
node examples/server.js
```

### 2. `client.js` - Client Testing

Client that tests all server endpoints:
- Public routes
- Protected routes
- API routes

```bash
npm run build
node examples/client.js
```

### 3. `advanced-server.js` - Advanced Patterns

Production-ready patterns:
- ✅ MVC architecture
- ✅ Multiple routers
- ✅ Role-based authorization
- ✅ Validation middleware
- ✅ Caching
- ✅ Rate limiting
- ✅ Request IDs

```bash
npm run build
node examples/advanced-server.js
```

### 4. `file-upload-server.js` - Form Data & File Uploads

File upload and form data handling:
- ✅ JSON form data
- ✅ URL-encoded forms
- ✅ Single file upload
- ✅ Multiple file uploads
- ✅ File validation
- ✅ Size limits

```bash
npm run build
node examples/file-upload-server.js
```

## 🎯 API Patterns

### Request Object (`req`)

```javascript
app.get('/users', (req, res) => {
  req.body        // Parsed body
  req.params      // URL parameters
  req.query       // Query string
  req.route       // Current route
  req.ip          // Client IP
  req.data        // Raw Buffer
  req.get('Auth') // Get header
});
```

### Response Object (`res`)

```javascript
app.get('/api', (req, res) => {
  res.send('text')              // Send any data
  res.json({ key: 'value' })    // Send JSON
  res.text('plain text')        // Send text
  res.status(404)               // Set status
  res.set('X-Custom', 'value')  // Set header
  res.sendStatus(200)           // Send status with message
  res.end()                     // End response
});
```

### Middleware

```javascript
// Global middleware
app.use((req, res, next) => {
  console.log('Request:', req.route);
  next();
});

// Route-specific middleware
app.get('/protected', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});
```

### Router

```javascript
const { Router } = require('fast-protocol');

const apiRouter = new Router();

// Router middleware
apiRouter.use(rateLimit({ max: 100, windowMs: 60000 }));

// Router routes
apiRouter.get('/status', (req, res) => {
  res.json({ status: 'ok' });
});

apiRouter.post('/data', (req, res) => {
  res.json({ received: req.body });
});

// Mount router
app.use(apiRouter);
```

### Controllers

```javascript
// users.controller.js
const usersController = {
  getAll: async (req, res, next) => {
    try {
      const users = await getUsers();
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      const user = await createUser(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
};

// Use in routes
app.get('/users', usersController.getAll);
app.post('/users', usersController.create);
```

### Authentication

```javascript
const authMiddleware = async (req, res, next) => {
  const token = req.get('Authorization');
  
  if (!token) {
    return res.status(401).json({ error: 'Auth required' });
  }
  
  try {
    req.user = await verifyToken(token);
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Use
app.get('/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});
```

### Validation

```javascript
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const field of schema.required) {
      if (!req.body[field]) {
        errors.push(`${field} is required`);
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    
    next();
  };
};

// Use
app.post('/users', 
  validate({ required: ['name', 'email'] }),
  (req, res) => {
    res.json({ created: true });
  }
);
```

## 🔧 Built-in Middleware

### Logger

```javascript
const { logger } = require('fast-protocol');

app.use(logger());
```

### JSON Body Parser

```javascript
const { json } = require('fast-protocol');

app.use(json());
```

### URL-Encoded Parser

```javascript
const { urlencoded } = require('fast-protocol');

// Simple mode
app.use(urlencoded());

// Extended mode (supports nested objects)
app.use(urlencoded({ extended: true }));

// Usage
app.post('/form', (req, res) => {
  console.log(req.body); // { name: 'John', email: 'john@example.com' }
  res.json({ received: req.body });
});
```

### Multipart / File Upload

```javascript
const { multipart } = require('fast-protocol');

// Single file upload
app.post('/upload', 
  multipart({
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 1
    },
    fileFilter: (file) => {
      // Only allow images
      return file.mimetype.startsWith('image/');
    }
  }),
  (req, res) => {
    console.log(req.file); // Uploaded file
    console.log(req.body); // Other form fields
    
    res.json({
      file: {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      }
    });
  }
);

// Multiple files
app.post('/upload/multiple',
  multipart({
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 10
    }
  }),
  (req, res) => {
    console.log(req.files); // All uploaded files
    
    const files = [];
    for (const [fieldname, file] of Object.entries(req.files)) {
      if (Array.isArray(file)) {
        files.push(...file);
      } else {
        files.push(file);
      }
    }
    
    res.json({ 
      count: files.length,
      files: files.map(f => ({
        name: f.originalname,
        size: f.size
      }))
    });
  }
);
```

### CORS

```javascript
const { cors } = require('fast-protocol');

app.use(cors({
  origin: '*',
  methods: 'GET,POST,PUT,DELETE'
}));
```

### Rate Limiting

```javascript
const { rateLimit } = require('fast-protocol');

app.use(rateLimit({ 
  max: 100,        // Max requests
  windowMs: 60000  // Per minute
}));
```

### Error Handler

```javascript
const { errorHandler } = require('fast-protocol');

app.use(errorHandler());
```

## 📊 Complete Example

```javascript
const { 
  Server, 
  Router,
  logger, 
  json, 
  cors,
  rateLimit 
} = require('fast-protocol');

// Create server
const app = new Server();

// Global middleware
app.use(logger());
app.use(json());
app.use(cors());

// Auth middleware
const auth = (req, res, next) => {
  const token = req.get('Authorization');
  if (!token) return res.status(401).json({ error: 'Auth required' });
  req.user = { id: 1, name: 'User' };
  next();
};

// Public routes
app.get('/ping', (req, res) => {
  res.json({ message: 'pong' });
});

app.post('/echo', (req, res) => {
  res.json({ echo: req.body });
});

// Protected routes
app.get('/profile', auth, (req, res) => {
  res.json({ user: req.user });
});

// API Router
const apiRouter = new Router();
apiRouter.use(rateLimit({ max: 100, windowMs: 60000 }));

apiRouter.get('/status', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use(apiRouter);

// Error handling
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

// Start
await app.listen(8080, () => {
  console.log('Server running on port 8080');
});
```

## 📤 Form Data & File Uploads

### JSON Form Data

```javascript
app.use(json());

app.post('/api/data', (req, res) => {
  const { name, email } = req.body;
  res.json({ received: { name, email } });
});
```

### URL-Encoded Forms

```javascript
app.use(urlencoded({ extended: true }));

app.post('/form/submit', (req, res) => {
  // Simple: name=John&email=john@example.com
  console.log(req.body); // { name: 'John', email: 'john@example.com' }
  
  // Extended (nested): user[name]=John&user[email]=john@example.com
  console.log(req.body); // { user: { name: 'John', email: 'john@example.com' } }
  
  res.send('Form received');
});
```

### Single File Upload

```javascript
app.post('/upload/avatar',
  multipart({
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (file) => file.mimetype.startsWith('image/')
  }),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Access uploaded file
    console.log(req.file.originalname);
    console.log(req.file.size);
    console.log(req.file.mimetype);
    console.log(req.file.buffer); // File contents
    
    // Save file
    const fs = require('fs');
    fs.writeFileSync(`./uploads/${req.file.originalname}`, req.file.buffer);
    
    res.json({ success: true, filename: req.file.originalname });
  }
);
```

### Multiple Files Upload

```javascript
app.post('/upload/gallery',
  multipart({
    limits: { 
      fileSize: 5 * 1024 * 1024,
      files: 10
    }
  }),
  (req, res) => {
    const uploadedFiles = [];
    
    // req.files is an object: { fieldname: file(s) }
    for (const [fieldname, file] of Object.entries(req.files)) {
      if (Array.isArray(file)) {
        uploadedFiles.push(...file);
      } else {
        uploadedFiles.push(file);
      }
    }
    
    res.json({
      count: uploadedFiles.length,
      files: uploadedFiles.map(f => ({
        name: f.originalname,
        size: f.size,
        type: f.mimetype
      }))
    });
  }
);
```

### Form + File Upload

```javascript
app.post('/profile/update',
  multipart({ limits: { fileSize: 2 * 1024 * 1024 } }),
  (req, res) => {
    // Access form fields
    const { name, bio } = req.body;
    
    // Access uploaded file
    const avatar = req.file;
    
    res.json({
      profile: { name, bio },
      avatar: avatar ? {
        filename: avatar.originalname,
        size: avatar.size
      } : null
    });
  }
);
```

## 🎓 Best Practices

1. **Use Controllers** - Separate business logic
2. **Use Routers** - Organize related routes
3. **Add Validation** - Validate input data
4. **Handle Errors** - Use error middleware
5. **Add Logging** - Track requests
6. **Use Auth** - Protect sensitive routes
7. **Rate Limit** - Prevent abuse
8. **Cache** - Cache expensive operations
9. **Validate Files** - Check file types and sizes
10. **Sanitize Input** - Clean user input

## 📚 More Examples

- **MVC Pattern**: See `advanced-server.js`
- **Authentication**: JWT tokens, sessions
- **Database**: MongoDB, PostgreSQL integration
- **File Upload**: Multipart form data
- **WebSockets**: Real-time communication
- **Testing**: Unit and integration tests

## 🤝 Support

For questions or issues, please check:
- Main README: `../README.md`
- API Documentation
- GitHub Issues

---

**Happy coding!** 🚀


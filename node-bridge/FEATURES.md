# Fast Protocol - Complete Features Guide

## ✅ **All Express.js Features Implemented**

### 🎯 **1. JSON Body Parsing (req.body)**

```javascript
const { json } = require('fast-protocol');

app.use(json());

app.post('/api/users', (req, res) => {
  // Automatic JSON parsing
  const { name, email, age } = req.body;
  
  console.log(req.body);
  // { name: 'John', email: 'john@example.com', age: 30 }
  
  res.json({ success: true, user: req.body });
});
```

**✅ Works with:**
- `Content-Type: application/json`
- Automatic parsing
- Error handling for invalid JSON

---

### 🎯 **2. Route Parameters (req.params)**

```javascript
// Single parameter
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ id: userId });
});

// Multiple parameters
app.get('/posts/:postId/comments/:commentId', (req, res) => {
  const { postId, commentId } = req.params;
  res.json({ postId, commentId });
});

// With operations
app.put('/users/:id', (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  res.json({ id, ...updates });
});

app.delete('/users/:id', (req, res) => {
  res.json({ deleted: req.params.id });
});
```

**✅ Supports:**
- Single parameters: `/users/:id`
- Multiple parameters: `/posts/:postId/comments/:commentId`
- Nested routes: `/api/:version/users/:userId`
- Pattern matching with regex

---

### 🎯 **3. Query Parameters (req.query)**

```javascript
// GET /search?q=test&page=2&limit=10

app.get('/search', (req, res) => {
  const { q, page, limit } = req.query;
  
  console.log(req.query);
  // { q: 'test', page: '2', limit: '10' }
  
  res.json({
    query: q,
    page: parseInt(page || '1'),
    limit: parseInt(limit || '10')
  });
});
```

**✅ Features:**
- Automatic URL decoding
- All query params accessible via `req.query`
- String values (convert with `parseInt()`, etc.)
- Multiple values support

---

### 🎯 **4. Headers (req.headers, req.get())**

```javascript
app.get('/api/data', (req, res) => {
  // Get all headers
  console.log(req.headers);
  
  // Get specific header
  const auth = req.get('Authorization');
  const contentType = req.get('Content-Type');
  const userAgent = req.get('User-Agent');
  
  res.json({
    auth,
    contentType,
    userAgent
  });
});
```

**✅ Supports:**
- `req.headers` - All headers object
- `req.get(name)` - Get specific header
- Case-insensitive header names
- Standard and custom headers

---

### 🎯 **5. URL-Encoded Forms (req.body)**

```javascript
const { urlencoded } = require('fast-protocol');

app.use(urlencoded({ extended: true }));

app.post('/form', (req, res) => {
  // POST: name=John&email=john@example.com
  console.log(req.body);
  // { name: 'John', email: 'john@example.com' }
  
  // Extended mode: user[name]=John&user[age]=30
  // { user: { name: 'John', age: '30' } }
  
  res.json(req.body);
});
```

**✅ Features:**
- Simple mode: `name=value&key=value`
- Extended mode: Nested objects `user[name]=John`
- Array support: `items[]=1&items[]=2`
- Automatic URL decoding

---

### 🎯 **6. File Uploads (req.file, req.files)**

```javascript
const { multipart } = require('fast-protocol');

// Single file
app.post('/upload', 
  multipart({ limits: { fileSize: 5 * 1024 * 1024 } }),
  (req, res) => {
    console.log(req.file);
    // {
    //   fieldname: 'avatar',
    //   originalname: 'photo.jpg',
    //   mimetype: 'image/jpeg',
    //   buffer: Buffer,
    //   size: 12345
    // }
    
    console.log(req.body); // Other form fields
    
    res.json({ success: true });
  }
);

// Multiple files
app.post('/upload/multiple',
  multipart({ limits: { files: 10 } }),
  (req, res) => {
    console.log(req.files);
    // { 
    //   avatar: UploadedFile,
    //   documents: [UploadedFile, UploadedFile]
    // }
  }
);
```

**✅ Features:**
- Single file: `req.file`
- Multiple files: `req.files`
- File size limits
- File type filtering
- Form fields + files together

---

### 🎯 **7. Combined Usage**

```javascript
// Params + Query + Body + Headers
app.post('/api/users/:userId/orders', (req, res) => {
  const userId = req.params.userId;        // From URL path
  const { notify, priority } = req.query;  // From ?notify=true
  const orderData = req.body;              // From JSON body
  const token = req.get('Authorization');  // From headers
  
  res.json({
    userId,
    notify: notify === 'true',
    priority: priority || 'normal',
    order: orderData,
    authenticated: !!token
  });
});
```

---

## 🔥 **Request Object API**

```javascript
app.get('/example', (req, res) => {
  // URL & Path
  req.url          // '/users?page=1'
  req.path         // '/users'
  req.route        // Full route pattern
  req.originalUrl  // Original URL
  
  // Parameters
  req.params       // { id: '123' }
  req.query        // { page: '1', limit: '10' }
  req.body         // { name: 'John' }
  
  // Headers
  req.headers      // All headers object
  req.get('name')  // Get specific header
  
  // Files
  req.file         // Single uploaded file
  req.files        // Multiple uploaded files
  
  // Network
  req.ip           // Client IP address
  req.remoteAddr   // Remote address
  
  // Helpers
  req.param('id', 'default')  // Get param (params → query → default)
  req.json()       // Parse body as JSON
  req.text()       // Get body as text
  req.accepts('json')  // Check Accept header
  req.is('json')   // Check Content-Type
});
```

---

## 🔥 **Response Object API**

```javascript
app.get('/example', (req, res) => {
  // Status
  res.status(200)           // Set status code
  res.sendStatus(404)       // Send status + message
  
  // Headers
  res.set('X-Custom', 'value')  // Set header
  res.get('X-Custom')           // Get header
  
  // Send
  res.send('text')          // Send any data
  res.json({ key: 'value' })  // Send JSON
  res.text('plain text')    // Send text
  
  // End
  res.end()                 // End without data
  res.end('data')           // End with data
  
  // Chaining
  res.status(201)
     .set('X-Custom', 'value')
     .json({ created: true });
});
```

---

## 📊 **Complete Example**

```javascript
const { Server, json, urlencoded, multipart } = require('fast-protocol');

const app = new Server();

// Middleware
app.use(json());
app.use(urlencoded({ extended: true }));

// Routes with all features
app.get('/users/:id', (req, res) => {
  // req.params.id available
  res.json({ id: req.params.id });
});

app.get('/search', (req, res) => {
  // req.query available
  res.json({ query: req.query.q });
});

app.post('/users', (req, res) => {
  // req.body available
  res.status(201).json({ user: req.body });
});

app.post('/upload', multipart(), (req, res) => {
  // req.file and req.body available
  res.json({ 
    file: req.file.originalname,
    fields: req.body 
  });
});

await app.listen(8080);
```

---

## 🎯 **Test Commands**

```bash
# JSON Body
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'

# Route Parameters
curl http://localhost:8080/api/users/123

# Query Parameters
curl "http://localhost:8080/api/search?q=test&page=2&limit=10"

# URL-Encoded Form
curl -X POST http://localhost:8080/form \
  -d "name=John&email=john@example.com"

# File Upload
curl -X POST http://localhost:8080/upload \
  -F "file=@image.jpg" \
  -F "title=My Image"

# Combined (params + query + body)
curl -X POST "http://localhost:8080/users/123/orders?notify=true" \
  -H "Content-Type: application/json" \
  -d '{"items":["item1","item2"]}'

# With Headers
curl http://localhost:8080/api/data \
  -H "Authorization: Bearer token123" \
  -H "X-Custom: value"
```

---

## ✅ **All Express.js Features**

✅ `req.body` - JSON, URL-encoded, multipart  
✅ `req.params` - Route parameters `:id`  
✅ `req.query` - Query strings `?key=value`  
✅ `req.headers` - HTTP headers  
✅ `req.get()` - Get specific header  
✅ `req.file` - Single file upload  
✅ `req.files` - Multiple file uploads  
✅ `req.ip` - Client IP  
✅ `req.param()` - Helper for params/query  
✅ `req.json()` - Parse as JSON  
✅ `req.text()` - Get as text  
✅ `res.status()` - Set status code  
✅ `res.send()` - Send response  
✅ `res.json()` - Send JSON  
✅ `res.text()` - Send text  
✅ `res.set()` - Set headers  
✅ `res.get()` - Get headers  
✅ Middleware support  
✅ Router support  
✅ Error handling  
✅ Nested routes  

**100% Express.js compatible!** 🎉

---

## 📚 **Examples**

See `examples/` directory:
- `complete-api-server.js` - All features demo
- `file-upload-server.js` - File upload examples
- `advanced-server.js` - MVC patterns
- `server.js` - Basic Express-style server

---

**Made with ❤️ - Fast Protocol Team**


/**
 * Complete API Example - All Features
 * Shows: JSON, req.body, req.params, req.query, req.headers
 */

const { 
  Server, 
  Router,
  logger, 
  json,
  urlencoded,
  cors 
} = require('../dist/index');

async function main() {
  const app = new Server();

  // ===== Global Middleware =====
  app.use(logger());
  app.use(json());                    // Parse JSON body
  app.use(urlencoded({ extended: true })); // Parse form data
  app.use(cors());

  // ===== 1. JSON Body (req.body) =====
  
  app.post('/api/users', (req, res) => {
    // Access JSON body
    const { name, email, age } = req.body;
    
    console.log('Creating user:', req.body);
    
    res.status(201).json({
      success: true,
      message: 'User created',
      user: {
        id: Date.now(),
        name,
        email,
        age,
        createdAt: new Date().toISOString()
      }
    });
  });

  // ===== 2. Route Parameters (req.params) =====
  
  // Single parameter
  app.get('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    
    console.log('Getting user:', userId);
    
    res.json({
      success: true,
      user: {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com'
      }
    });
  });

  // Multiple parameters
  app.get('/api/posts/:postId/comments/:commentId', (req, res) => {
    const { postId, commentId } = req.params;
    
    console.log('Post:', postId, 'Comment:', commentId);
    
    res.json({
      success: true,
      post: { id: postId },
      comment: { id: commentId, text: 'Great post!' }
    });
  });

  // Parameter with update
  app.put('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const updates = req.body;
    
    console.log('Updating user:', userId, 'with:', updates);
    
    res.json({
      success: true,
      message: 'User updated',
      user: {
        id: userId,
        ...updates,
        updatedAt: new Date().toISOString()
      }
    });
  });

  // Parameter with deletion
  app.delete('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    
    console.log('Deleting user:', userId);
    
    res.json({
      success: true,
      message: `User ${userId} deleted`
    });
  });

  // ===== 3. Query Parameters (req.query) =====
  
  app.get('/api/search', (req, res) => {
    // Access query parameters
    const { q, page, limit, sort } = req.query;
    
    console.log('Search query:', {
      query: q,
      page: page || '1',
      limit: limit || '10',
      sort: sort || 'date'
    });
    
    res.json({
      success: true,
      query: q,
      pagination: {
        page: parseInt(page || '1'),
        limit: parseInt(limit || '10')
      },
      sort: sort || 'date',
      results: [
        { id: 1, title: 'Result 1' },
        { id: 2, title: 'Result 2' }
      ]
    });
  });

  // Filter example
  app.get('/api/products', (req, res) => {
    const { category, minPrice, maxPrice, inStock } = req.query;
    
    console.log('Filtering products:', {
      category,
      minPrice,
      maxPrice,
      inStock: inStock === 'true'
    });
    
    res.json({
      success: true,
      filters: {
        category,
        priceRange: { min: minPrice, max: maxPrice },
        inStock: inStock === 'true'
      },
      products: [
        { id: 1, name: 'Product 1', price: 100, category: category || 'all' },
        { id: 2, name: 'Product 2', price: 200, category: category || 'all' }
      ]
    });
  });

  // ===== 4. Headers (req.headers, req.get()) =====
  
  app.get('/api/headers', (req, res) => {
    // Access all headers
    console.log('All headers:', req.headers);
    
    // Get specific header
    const userAgent = req.get('user-agent');
    const authorization = req.get('authorization');
    const contentType = req.get('content-type');
    
    res.json({
      success: true,
      headers: {
        userAgent,
        authorization,
        contentType,
        allHeaders: req.headers
      }
    });
  });

  // ===== 5. Combined: Params + Query + Body =====
  
  app.post('/api/users/:userId/orders', (req, res) => {
    const userId = req.params.userId;      // From URL
    const { notify } = req.query;          // From query string
    const orderData = req.body;            // From JSON body
    
    console.log('Creating order for user:', userId);
    console.log('Notify:', notify === 'true');
    console.log('Order data:', orderData);
    
    res.status(201).json({
      success: true,
      order: {
        id: Date.now(),
        userId,
        ...orderData,
        notified: notify === 'true',
        createdAt: new Date().toISOString()
      }
    });
  });

  // ===== 6. req.param() helper =====
  
  app.get('/api/items/:id', (req, res) => {
    // req.param() checks params, then query, then default
    const id = req.param('id');
    const format = req.param('format', 'json'); // default: 'json'
    
    console.log('Item ID:', id, 'Format:', format);
    
    if (format === 'xml') {
      res.set('Content-Type', 'application/xml');
      res.send(`<item><id>${id}</id></item>`);
    } else {
      res.json({
        success: true,
        item: { id, name: `Item ${id}` }
      });
    }
  });

  // ===== 7. Complex REST API Example =====
  
  const apiRouter = new Router();

  // GET /api/v1/users?page=1&limit=10&sort=name
  apiRouter.get('/api/v1/users', (req, res) => {
    const { page = '1', limit = '10', sort = 'id' } = req.query;
    
    res.json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 100
      },
      sort,
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]
    });
  });

  // GET /api/v1/users/:id
  apiRouter.get('/api/v1/users/:id', (req, res) => {
    res.json({
      success: true,
      user: {
        id: req.params.id,
        name: 'John Doe',
        email: 'john@example.com'
      }
    });
  });

  // POST /api/v1/users
  apiRouter.post('/api/v1/users', (req, res) => {
    res.status(201).json({
      success: true,
      user: { id: Date.now(), ...req.body }
    });
  });

  // PUT /api/v1/users/:id
  apiRouter.put('/api/v1/users/:id', (req, res) => {
    res.json({
      success: true,
      user: { id: req.params.id, ...req.body }
    });
  });

  // DELETE /api/v1/users/:id
  apiRouter.delete('/api/v1/users/:id', (req, res) => {
    res.json({
      success: true,
      message: `User ${req.params.id} deleted`
    });
  });

  app.use(apiRouter);

  // ===== 8. Nested Resources =====
  
  // GET /api/authors/:authorId/books/:bookId
  app.get('/api/authors/:authorId/books/:bookId', (req, res) => {
    const { authorId, bookId } = req.params;
    
    res.json({
      success: true,
      author: { id: authorId, name: 'Author Name' },
      book: { id: bookId, title: 'Book Title' }
    });
  });

  // ===== Error Handler =====
  app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  });

  // ===== Start Server =====
  await app.listen(8080, () => {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   🚀 Complete API Server (All Features)       ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log('📍 Server: http://localhost:8080');
    console.log('');
    console.log('📋 Features Demonstrated:');
    console.log('');
    console.log('  ✅ JSON Body Parsing (req.body)');
    console.log('  ✅ Route Parameters (req.params)');
    console.log('  ✅ Query Parameters (req.query)');
    console.log('  ✅ Headers (req.headers, req.get())');
    console.log('  ✅ Combined params + query + body');
    console.log('  ✅ REST API patterns');
    console.log('  ✅ Nested resources');
    console.log('');
    console.log('🔥 Test Commands:');
    console.log('');
    console.log('  # 1. JSON Body (POST)');
    console.log('  curl -X POST http://localhost:8080/api/users \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"name":"John","email":"john@example.com","age":30}\'');
    console.log('');
    console.log('  # 2. Route Parameters (GET)');
    console.log('  curl http://localhost:8080/api/users/123');
    console.log('');
    console.log('  # 3. Query Parameters (GET)');
    console.log('  curl "http://localhost:8080/api/search?q=test&page=2&limit=20"');
    console.log('');
    console.log('  # 4. Update with params + body (PUT)');
    console.log('  curl -X PUT http://localhost:8080/api/users/123 \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"name":"John Updated"}\'');
    console.log('');
    console.log('  # 5. Combined (params + query + body)');
    console.log('  curl -X POST "http://localhost:8080/api/users/123/orders?notify=true" \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"items":["item1","item2"],"total":100}\'');
    console.log('');
    console.log('  # 6. Nested resources');
    console.log('  curl http://localhost:8080/api/authors/456/books/789');
    console.log('');
    console.log('  # 7. Filters with query params');
    console.log('  curl "http://localhost:8080/api/products?category=electronics&minPrice=100&maxPrice=500&inStock=true"');
    console.log('');
    console.log('  # 8. Headers');
    console.log('  curl http://localhost:8080/api/headers \\');
    console.log('    -H "Authorization: Bearer token123" \\');
    console.log('    -H "X-Custom-Header: value"');
    console.log('');
  });
}

main().catch(console.error);


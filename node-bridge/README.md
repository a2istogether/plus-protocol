# Fast Protocol - Node.js Bridge

High-speed, cross-platform custom network protocol for Node.js with Express-style API.

## Features

- 🚀 **High Performance**: UDP-based transport with async/await support
- 🔒 **Reliable Delivery**: ACK/NACK with automatic retransmission
- 🔐 **Encryption**: Optional AES-256-GCM or ChaCha20-Poly1305
- 📦 **Compression**: Optional Zstd or LZ4 compression
- 🎯 **Express-style API**: Familiar `on(route, handler)` pattern
- 🔌 **Middleware Support**: Composable request processing
- 📡 **Heartbeat**: Built-in keep-alive mechanism

## Installation

```bash
npm install fast-protocol
```

## Quick Start

### Server

```javascript
const { Server, Response, loggingMiddleware } = require('fast-protocol');

const server = new Server();

// Add middleware
server.use(loggingMiddleware());

// Register routes
server.on('/ping', async (ctx) => {
  return Response.text('pong');
});

server.on('/echo', async (ctx) => {
  const message = ctx.text();
  return Response.text(message);
});

server.on('/json', async (ctx) => {
  const data = ctx.json();
  return Response.json({ received: data });
});

// Start listening
await server.listen('127.0.0.1:8080');
console.log('Server listening on 127.0.0.1:8080');
```

### Client

```javascript
const { Client } = require('fast-protocol');

const client = new Client('127.0.0.1:0', '127.0.0.1:8080');

// Connect
await client.connect();

// Send requests
const response = await client.request('/ping', '');
console.log(response.toString()); // 'pong'

// Send JSON
const jsonResponse = await client.requestJson('/json', {
  message: 'Hello, World!'
});
console.log(jsonResponse);

// Disconnect
await client.disconnect();
```

## API

### Server

#### `new Server(config?)`

Create a new server instance.

**Config options:**
- `ackTimeout`: Acknowledgment timeout in milliseconds (default: 1000)
- `maxRetransmit`: Maximum retransmission attempts (default: 3)
- `heartbeatInterval`: Heartbeat interval in milliseconds (default: 30000)
- `encryption`: Encryption configuration
  - `algorithm`: 'aes256' or 'chacha20'
  - `key`: 32-byte encryption key
- `compression`: Compression configuration
  - `algorithm`: 'zstd' or 'lz4'
  - `level`: Compression level

#### `server.on(route, handler)`

Register a route handler.

```javascript
server.on('/route', async (ctx) => {
  // ctx.route - route path
  // ctx.data - raw Buffer
  // ctx.remoteAddr - remote address
  // ctx.json() - parse as JSON
  // ctx.text() - get as string
  
  return Response.text('Hello');
});
```

#### `server.use(middleware)`

Add middleware.

```javascript
server.use(async (ctx, next) => {
  console.log(`Request: ${ctx.route}`);
  const response = await next();
  console.log(`Response: ${response.data.length} bytes`);
  return response;
});
```

#### `server.listen(addr)`

Start listening on the specified address.

```javascript
await server.listen('127.0.0.1:8080');
```

### Client

#### `new Client(bindAddr, serverAddr, config?)`

Create a new client instance.

#### `client.connect()`

Connect to the server.

```javascript
await client.connect();
```

#### `client.request(route, data)`

Send a request and wait for response.

```javascript
const response = await client.request('/ping', Buffer.from('hello'));
```

#### `client.requestJson(route, data)`

Send JSON data and receive JSON response.

```javascript
const response = await client.requestJson('/api', { key: 'value' });
```

#### `client.send(route, data)`

Send data without waiting for response.

```javascript
await client.send('/log', 'Event occurred');
```

#### `client.disconnect()`

Disconnect from the server.

```javascript
await client.disconnect();
```

### Response

#### `Response.text(text)`

Create a text response.

```javascript
return Response.text('Hello, World!');
```

#### `Response.json(obj)`

Create a JSON response.

```javascript
return Response.json({ status: 'ok', data: [1, 2, 3] });
```

#### `Response.binary(buffer)`

Create a binary response.

```javascript
return Response.binary(Buffer.from([0x01, 0x02, 0x03]));
```

## Built-in Middleware

### Logging Middleware

```javascript
const { loggingMiddleware } = require('fast-protocol');

server.use(loggingMiddleware());
```

### CORS Middleware

```javascript
const { corsMiddleware } = require('fast-protocol');

server.use(corsMiddleware());
```

### Rate Limiting Middleware

```javascript
const { rateLimitMiddleware } = require('fast-protocol');

// Max 100 requests per minute per client
server.use(rateLimitMiddleware(100, 60000));
```

## Examples

See the `examples/` directory for complete working examples:
- `server.js` - Server with multiple routes
- `client.js` - Client making various requests

## License

MIT


# Fast Protocol - WebAssembly

WebAssembly bindings for using Fast Protocol in the browser.

## Features

- 🌐 **Browser Support**: Run protocol in any modern browser
- 🔌 **WebSocket Transport**: Communication via WebSocket
- 🚀 **Same API**: Familiar `on(route, handler)` pattern
- 📦 **Lightweight**: Small WASM binary
- 🎯 **TypeScript Support**: Full type definitions

## Building

```bash
# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build for web
npm run build

# Build for Node.js
npm run build:nodejs

# Build for bundlers (webpack, rollup, etc.)
npm run build:bundler

# Build all targets
npm run build:all
```

## Usage

### Basic Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Fast Protocol Demo</title>
</head>
<body>
    <script type="module">
        import init, { ProtocolClient, encode_string } from './pkg/fast_protocol_wasm.js';

        async function main() {
            // Initialize WASM
            await init();

            // Create client
            const client = new ProtocolClient();

            // Connect to server via WebSocket
            await client.connect('ws://localhost:8080');

            // Send request
            const data = encode_string('Hello, World!');
            const response = await client.request('/echo', data);

            console.log('Response:', response);
        }

        main();
    </script>
</body>
</html>
```

### With Handlers

```javascript
import init, { ProtocolClient, encode_string, decode_string } from './pkg/fast_protocol_wasm.js';

await init();

const client = new ProtocolClient();

// Register handler
client.on('/notification', (data) => {
    const message = decode_string(data);
    console.log('Notification:', message);
});

// Connect
await client.connect('ws://localhost:8080');

// Send request
const response = await client.request('/ping', encode_string(''));
console.log('Pong!');
```

### JSON Support

```javascript
import { encode_json, decode_json } from './pkg/fast_protocol_wasm.js';

// Send JSON
const payload = { name: 'Alice', age: 30 };
const data = encode_json(payload);
const response = await client.request('/api/user', data);

// Parse JSON response
const result = decode_json(response);
console.log(result);
```

## API

### ProtocolClient

#### `new ProtocolClient()`

Create a new protocol client.

```javascript
const client = new ProtocolClient();
```

#### `client.connect(url)`

Connect to server via WebSocket.

```javascript
await client.connect('ws://localhost:8080');
```

#### `client.on(route, handler)`

Register a route handler for incoming messages.

```javascript
client.on('/notification', (data) => {
    console.log('Received:', decode_string(data));
});
```

#### `client.request(route, data)`

Send a request and wait for response.

```javascript
const data = encode_string('Hello');
const response = await client.request('/echo', data);
```

#### `client.send(route, data)`

Send data without waiting for response.

```javascript
client.send('/log', encode_string('Event occurred'));
```

#### `client.disconnect()`

Disconnect from server.

```javascript
client.disconnect();
```

#### `client.is_connected()`

Check connection status.

```javascript
if (client.is_connected()) {
    console.log('Connected!');
}
```

### Utility Functions

#### `encode_string(s)`

Convert string to bytes.

```javascript
const bytes = encode_string('Hello, World!');
```

#### `decode_string(data)`

Convert bytes to string.

```javascript
const text = decode_string(bytes);
```

#### `encode_json(value)`

Serialize JSON to bytes.

```javascript
const bytes = encode_json({ key: 'value' });
```

#### `decode_json(data)`

Parse bytes as JSON.

```javascript
const obj = decode_json(bytes);
```

## Demo

Open `index.html` in a web browser to see the interactive demo.

The demo includes:
- Connection management
- Sending ping/echo/json requests
- Real-time output display

## Integration with Bundlers

### Webpack

```javascript
// webpack.config.js
module.exports = {
    experiments: {
        asyncWebAssembly: true,
    },
};
```

### Vite

```javascript
// vite.config.js
export default {
    optimizeDeps: {
        exclude: ['fast-protocol-wasm'],
    },
};
```

### Rollup

```javascript
// rollup.config.js
import wasm from '@rollup/plugin-wasm';

export default {
    plugins: [wasm()],
};
```

## Browser Compatibility

- Chrome 57+
- Firefox 52+
- Safari 11+
- Edge 16+

## Size

The compiled WASM binary is approximately:
- Uncompressed: ~200KB
- Gzipped: ~50KB

## License

MIT


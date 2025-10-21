# Quick Start Guide

Get up and running with Fast Protocol in 5 minutes!

## 🚀 Installation

### Option 1: Automated Build (Recommended)

**Linux/macOS:**
```bash
git clone https://github.com/yourorg/fast-protocol
cd fast-protocol
chmod +x build.sh
./build.sh
```

**Windows:**
```powershell
git clone https://github.com/yourorg/fast-protocol
cd fast-protocol
.\build.ps1
```

### Option 2: Using Make

```bash
git clone https://github.com/yourorg/fast-protocol
cd fast-protocol
make build
```

## 📝 Your First Server (Rust)

Create `my-server.rs`:

```rust
use fast_protocol::{Server, Response, middleware::Context};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let server = std::sync::Arc::new(
        Server::new("127.0.0.1:8080", Default::default()).await?
    );
    
    server.on_async("/ping", |_ctx: Context| async {
        Ok(Response::text("pong"))
    }).await;
    
    println!("Server listening on 127.0.0.1:8080");
    server.listen().await?;
    Ok(())
}
```

Run it:
```bash
cargo run
```

## 📝 Your First Client (Rust)

Create `my-client.rs`:

```rust
use fast_protocol::Client;
use bytes::Bytes;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = std::sync::Arc::new(
        Client::new(
            "127.0.0.1:0",
            "127.0.0.1:8080".parse()?,
            Default::default()
        ).await?
    );
    
    // Start receiver
    let client_clone = client.clone();
    tokio::spawn(async move {
        let _ = client_clone.start_recv_loop().await;
    });
    
    client.connect().await?;
    
    let response = client.request("/ping", Bytes::new()).await?;
    println!("Response: {}", String::from_utf8_lossy(&response));
    
    Ok(())
}
```

## 🟢 Node.js Example

**Server:**
```javascript
const { Server, Response } = require('fast-protocol');

const server = new Server();

server.on('/ping', async (ctx) => {
    return Response.text('pong');
});

server.on('/echo', async (ctx) => {
    const message = ctx.text();
    return Response.text(message);
});

await server.listen('127.0.0.1:8080');
console.log('Server running!');
```

**Client:**
```javascript
const { Client } = require('fast-protocol');

const client = new Client('127.0.0.1:0', '127.0.0.1:8080');
await client.connect();

const response = await client.request('/ping', '');
console.log(response.toString()); // 'pong'
```

## 🌐 Browser Example (WASM)

```html
<!DOCTYPE html>
<html>
<body>
    <script type="module">
        import init, { ProtocolClient, encode_string } 
            from './pkg/fast_protocol_wasm.js';
        
        await init();
        
        const client = new ProtocolClient();
        await client.connect('ws://localhost:8080');
        
        const response = await client.request(
            '/ping', 
            encode_string('')
        );
        
        console.log('Pong!');
    </script>
</body>
</html>
```

## 📱 iOS Example (Swift)

```swift
import FastProtocol

let client = Client(serverAddress: "127.0.0.1:8080")
try await client.connect()

let response = try await client.request("/ping", text: "")
print(response) // "pong"
```

## 🤖 Android Example (Kotlin)

```kotlin
import com.fastprotocol.*

suspend fun main() {
    val client = Client(serverAddress = "127.0.0.1:8080")
    client.connect()
    
    val response = client.request("/ping", "")
    println(response) // "pong"
}
```

## ⚡ Try the Examples

The repository includes ready-to-run examples:

```bash
# Terminal 1 - Start server
cd examples/rust
cargo run --bin server --release

# Terminal 2 - Run client
cargo run --bin client --release
```

You should see:
```
--- Ping Test ---
Response: pong

--- Echo Test ---
Response: Hello, World!

--- JSON Test ---
Response: {"message":"Received","received":"Alice","timestamp":1234567890}

All tests completed successfully!
```

## 🎯 Common Use Cases

### 1. JSON API

```rust
server.on_async("/api/user", |ctx: Context| async {
    use serde::{Deserialize, Serialize};
    
    #[derive(Deserialize)]
    struct Request {
        name: String,
        email: String,
    }
    
    #[derive(Serialize)]
    struct Response {
        id: String,
        status: String,
    }
    
    let req: Request = ctx.json()?;
    let resp = Response {
        id: uuid::Uuid::new_v4().to_string(),
        status: "created".to_string(),
    };
    
    fast_protocol::middleware::Response::json(&resp)
}).await;
```

### 2. File Transfer

```rust
server.on_async("/upload", |ctx: Context| async {
    let filename = ctx.route;
    std::fs::write(filename, &ctx.payload)?;
    Ok(Response::text("Uploaded"))
}).await;
```

### 3. Real-time Events

```rust
client.send("/event", serde_json::to_vec(&event)?).await?;
```

## 🔧 Configuration

```rust
use fast_protocol::transport::TransportConfig;
use std::time::Duration;

let config = TransportConfig {
    ack_timeout: Duration::from_millis(1000),
    max_retransmit: 3,
    heartbeat_interval: Duration::from_secs(30),
    enable_encryption: false,
    enable_compression: false,
};
```

## 🔐 Enable Encryption

```rust
use fast_protocol::crypto::CryptoProvider;

let key = CryptoProvider::generate_key();
let crypto = CryptoProvider::new_aes(&key);

let mut server = Server::new("127.0.0.1:8080", config).await?;
server.set_crypto(crypto);
```

## 📦 Enable Compression

```rust
use fast_protocol::compression::CompressionProvider;

let compression = CompressionProvider::new_zstd(3);

let mut server = Server::new("127.0.0.1:8080", config).await?;
server.set_compression(compression);
```

## 🐛 Debugging

Enable detailed logs:

```bash
RUST_LOG=debug cargo run
```

```rust
// Initialize logging in your code
tracing_subscriber::fmt::init();
```

## 📚 Next Steps

1. **Read the full documentation**: [README.md](README.md)
2. **Explore examples**: [examples/](examples/)
3. **Configure your setup**: [SETUP.md](SETUP.md)
4. **Learn to contribute**: [CONTRIBUTING.md](CONTRIBUTING.md)

## 🆘 Troubleshooting

### "Address already in use"

Change the port:
```rust
Server::new("127.0.0.1:8081", config).await?
```

### "Connection refused"

Make sure the server is running first.

### Build errors

```bash
cargo clean
cargo build
```

## 💡 Tips

- Use `cargo watch -x run` for auto-reload during development
- Run `cargo clippy` before committing
- Check `make help` for all available commands
- Join our Discord for help and discussions

## 📊 Performance Tips

- Use `--release` for production builds
- Enable compression for large payloads
- Use fire-and-forget (`send`) when you don't need responses
- Batch multiple requests when possible

## 🎉 You're Ready!

You now have a working Fast Protocol setup. Start building your high-speed applications!

For more advanced features and detailed API documentation, check out the full [README.md](README.md).

---

**Questions?** Open an issue or join our [Discord](https://discord.gg/fast-protocol)!


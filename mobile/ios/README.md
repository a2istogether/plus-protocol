# Fast Protocol - iOS Swift Bindings

High-speed, cross-platform custom network protocol for iOS, macOS, tvOS, and watchOS.

## Features

- 🚀 **Native Swift**: Idiomatic Swift API
- 🔒 **Type-Safe**: Full Swift type safety
- 📱 **Cross-Platform**: iOS, macOS, tvOS, watchOS
- 🎯 **Simple API**: Familiar async/await patterns
- 🔌 **Lightweight**: Minimal dependencies

## Requirements

- iOS 13.0+ / macOS 10.15+ / tvOS 13.0+ / watchOS 6.0+
- Xcode 15.0+
- Swift 5.9+

## Installation

### Swift Package Manager

Add to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/yourorg/fast-protocol", from: "0.1.0")
]
```

Or in Xcode:
1. File → Add Packages
2. Enter repository URL
3. Select version

### CocoaPods

```ruby
pod 'FastProtocol', '~> 0.1.0'
```

### Carthage

```
github "yourorg/fast-protocol" ~> 0.1.0
```

## Quick Start

### Server

```swift
import FastProtocol

let server = Server()

// Register routes
server.on("/ping") { ctx in
    return Response.text("pong")
}

server.on("/echo") { ctx in
    let message = try ctx.text()
    return Response.text(message)
}

// Start listening
try await server.listen("127.0.0.1:8080")
```

### Client

```swift
import FastProtocol

let client = Client(serverAddress: "127.0.0.1:8080")

// Connect
try await client.connect()

// Send request
let response = try await client.request("/ping", text: "")
print(response) // "pong"

// Disconnect
client.disconnect()
```

## API Documentation

### Server

#### Initialize

```swift
let server = Server(config: ServerConfig())
```

**ServerConfig Options:**
- `ackTimeout`: Acknowledgment timeout (default: 1.0s)
- `maxRetransmit`: Max retransmission attempts (default: 3)
- `heartbeatInterval`: Heartbeat interval (default: 30.0s)

#### Register Routes

```swift
server.on("/route") { ctx in
    // ctx.route - route path
    // ctx.data - raw Data
    // ctx.remoteAddress - remote address
    // ctx.json() - parse as JSON
    // ctx.text() - get as string
    
    return Response.text("Hello")
}
```

#### Listen

```swift
try await server.listen("127.0.0.1:8080")
```

### Client

#### Initialize

```swift
let client = Client(
    bindAddress: "0.0.0.0:0",  // optional
    serverAddress: "127.0.0.1:8080",
    config: ClientConfig()
)
```

**ClientConfig Options:**
- `ackTimeout`: Acknowledgment timeout (default: 1.0s)
- `maxRetransmit`: Max retransmission attempts (default: 3)
- `requestTimeout`: Request timeout (default: 5.0s)

#### Connect

```swift
try await client.connect()
```

#### Send Requests

**Text Request:**
```swift
let response = try await client.request("/ping", text: "hello")
```

**Binary Request:**
```swift
let data = Data([0x01, 0x02, 0x03])
let response = try await client.request("/binary", data: data)
```

**JSON Request:**
```swift
struct Request: Codable {
    let name: String
    let age: Int
}

struct Response: Codable {
    let message: String
}

let response: Response = try await client.requestJson(
    "/api",
    data: Request(name: "Alice", age: 30)
)
```

#### Fire-and-Forget

```swift
try await client.send("/log", data: logData)
```

#### Disconnect

```swift
client.disconnect()
```

### Response

```swift
// Text response
return Response.text("Hello, World!")

// JSON response
struct Data: Codable {
    let value: String
}
return try Response.json(Data(value: "test"))

// Binary response
return Response.binary(Data([0x01, 0x02, 0x03]))
```

## Examples

### Echo Server

```swift
let server = Server()

server.on("/echo") { ctx in
    let message = try ctx.text()
    print("Echo: \(message)")
    return Response.text(message)
}

try await server.listen("0.0.0.0:8080")
```

### JSON API

```swift
server.on("/user/create") { ctx in
    struct CreateUser: Codable {
        let name: String
        let email: String
    }
    
    struct UserResponse: Codable {
        let id: String
        let name: String
        let createdAt: Date
    }
    
    let request: CreateUser = try ctx.json()
    
    // Create user...
    let user = UserResponse(
        id: UUID().uuidString,
        name: request.name,
        createdAt: Date()
    )
    
    return try Response.json(user)
}
```

### Error Handling

```swift
do {
    let response = try await client.request("/api", text: "data")
    print(response)
} catch ProtocolError.timeout {
    print("Request timed out")
} catch ProtocolError.notConnected {
    print("Not connected to server")
} catch {
    print("Error: \(error)")
}
```

## Building from Source

```bash
# Clone repository
git clone https://github.com/yourorg/fast-protocol
cd fast-protocol/mobile/ios

# Build
swift build

# Run tests
swift test

# Generate Xcode project
swift package generate-xcodeproj
```

## License

MIT

## Support

- 📧 Email: support@example.com
- 🐛 Issues: https://github.com/yourorg/fast-protocol/issues
- 📖 Docs: https://docs.example.com


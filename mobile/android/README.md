# Fast Protocol - Android Kotlin Bindings

High-speed, cross-platform custom network protocol for Android.

## Features

- 🚀 **Native Kotlin**: Idiomatic Kotlin API with coroutines
- 🔒 **Type-Safe**: Full Kotlin type safety
- 📱 **Android Ready**: Optimized for Android
- 🎯 **Simple API**: Familiar suspend function patterns
- 🔌 **Lightweight**: Minimal dependencies

## Requirements

- Android API 21+ (Android 5.0 Lollipop)
- Kotlin 1.9+
- Gradle 8.0+

## Installation

### Gradle (Kotlin DSL)

```kotlin
dependencies {
    implementation("com.fastprotocol:fast-protocol:0.1.0")
}
```

### Gradle (Groovy)

```groovy
dependencies {
    implementation 'com.fastprotocol:fast-protocol:0.1.0'
}
```

### Maven

```xml
<dependency>
    <groupId>com.fastprotocol</groupId>
    <artifactId>fast-protocol</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Quick Start

### Server

```kotlin
import com.fastprotocol.*

val server = Server()

// Register routes
server.on("/ping") { ctx ->
    Response.text("pong")
}

server.on("/echo") { ctx ->
    val message = ctx.text()
    Response.text(message)
}

// Start listening
server.listen("127.0.0.1:8080")
```

### Client

```kotlin
import com.fastprotocol.*

val client = Client(serverAddress = "127.0.0.1:8080")

// Connect
client.connect()

// Send request
val response = client.request("/ping", "")
println(response) // "pong"

// Disconnect
client.disconnect()
```

## API Documentation

### Server

#### Initialize

```kotlin
val server = Server(
    config = ServerConfig(
        ackTimeout = 1000,
        maxRetransmit = 3,
        heartbeatInterval = 30000
    )
)
```

#### Register Routes

```kotlin
server.on("/route") { ctx ->
    // ctx.route - route path
    // ctx.data - raw ByteArray
    // ctx.remoteAddress - remote address
    // ctx.json<T>() - parse as JSON
    // ctx.text() - get as string
    
    Response.text("Hello")
}
```

#### Listen

```kotlin
server.listen("127.0.0.1:8080")
```

### Client

#### Initialize

```kotlin
val client = Client(
    bindAddress = "0.0.0.0:0",  // optional
    serverAddress = "127.0.0.1:8080",
    config = ClientConfig(
        ackTimeout = 1000,
        maxRetransmit = 3,
        requestTimeout = 5000
    )
)
```

#### Connect

```kotlin
client.connect()
```

#### Send Requests

**Text Request:**
```kotlin
val response = client.request("/ping", "hello")
```

**Binary Request:**
```kotlin
val data = byteArrayOf(0x01, 0x02, 0x03)
val response = client.request("/binary", data)
```

**JSON Request:**
```kotlin
@Serializable
data class Request(val name: String, val age: Int)

@Serializable
data class Response(val message: String)

val response = client.requestJson<Request, Response>(
    "/api",
    Request(name = "Alice", age = 30)
)
```

#### Fire-and-Forget

```kotlin
client.send("/log", logData)
```

#### Disconnect

```kotlin
client.disconnect()
```

### Response

```kotlin
// Text response
Response.text("Hello, World!")

// JSON response
@Serializable
data class Data(val value: String)
Response.json(Data(value = "test"))

// Binary response
Response.binary(byteArrayOf(0x01, 0x02, 0x03))
```

## Examples

### Echo Server

```kotlin
val server = Server()

server.on("/echo") { ctx ->
    val message = ctx.text()
    println("Echo: $message")
    Response.text(message)
}

server.listen("0.0.0.0:8080")
```

### JSON API

```kotlin
server.on("/user/create") { ctx ->
    @Serializable
    data class CreateUser(
        val name: String,
        val email: String
    )
    
    @Serializable
    data class UserResponse(
        val id: String,
        val name: String,
        val createdAt: Long
    )
    
    val request = ctx.json<CreateUser>()
    
    // Create user...
    val user = UserResponse(
        id = UUID.randomUUID().toString(),
        name = request.name,
        createdAt = System.currentTimeMillis()
    )
    
    Response.json(user)
}
```

### Error Handling

```kotlin
try {
    val response = client.request("/api", "data")
    println(response)
} catch (e: ProtocolError.Timeout) {
    println("Request timed out")
} catch (e: ProtocolError.NotConnected) {
    println("Not connected to server")
} catch (e: Exception) {
    println("Error: $e")
}
```

### Android Activity Example

```kotlin
class MainActivity : AppCompatActivity() {
    private lateinit var client: Client
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        client = Client(serverAddress = "192.168.1.100:8080")
        
        lifecycleScope.launch {
            try {
                client.connect()
                Toast.makeText(this@MainActivity, "Connected!", Toast.LENGTH_SHORT).show()
                
                val response = client.request("/ping", "")
                textView.text = response
            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "Error: $e", Toast.LENGTH_LONG).show()
            }
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        client.disconnect()
    }
}
```

### Permissions

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## ProGuard Rules

If using ProGuard/R8, add to `proguard-rules.pro`:

```
-keep class com.fastprotocol.** { *; }
-keepclassmembers class com.fastprotocol.** { *; }
```

## Building from Source

```bash
# Clone repository
git clone https://github.com/yourorg/fast-protocol
cd fast-protocol/mobile/android

# Build
./gradlew build

# Run tests
./gradlew test

# Publish to local Maven
./gradlew publishToMavenLocal
```

## License

MIT

## Support

- 📧 Email: support@example.com
- 🐛 Issues: https://github.com/yourorg/fast-protocol/issues
- 📖 Docs: https://docs.example.com


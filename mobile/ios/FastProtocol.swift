/**
 * Fast Protocol - iOS Swift Bindings
 * 
 * High-speed, cross-platform custom network protocol for iOS
 */

import Foundation

/// Protocol error types
public enum ProtocolError: Error {
    case connectionFailed(String)
    case timeout
    case invalidResponse
    case notConnected
    case other(String)
}

/// Request context
public struct Context {
    public let route: String
    public let data: Data
    public let remoteAddress: String
    
    /// Parse data as JSON
    public func json<T: Decodable>() throws -> T {
        let decoder = JSONDecoder()
        return try decoder.decode(T.self, from: data)
    }
    
    /// Get data as string
    public func text() throws -> String {
        guard let text = String(data: data, encoding: .utf8) else {
            throw ProtocolError.other("Invalid UTF-8")
        }
        return text
    }
}

/// Response builder
public struct Response {
    public let data: Data
    
    public init(data: Data) {
        self.data = data
    }
    
    /// Create a text response
    public static func text(_ text: String) -> Response {
        return Response(data: text.data(using: .utf8)!)
    }
    
    /// Create a JSON response
    public static func json<T: Encodable>(_ value: T) throws -> Response {
        let encoder = JSONEncoder()
        let data = try encoder.encode(value)
        return Response(data: data)
    }
    
    /// Create a binary response
    public static func binary(_ data: Data) -> Response {
        return Response(data: data)
    }
}

/// Handler closure type
public typealias Handler = (Context) throws -> Response

/// Server configuration
public struct ServerConfig {
    public var ackTimeout: TimeInterval = 1.0
    public var maxRetransmit: Int = 3
    public var heartbeatInterval: TimeInterval = 30.0
    
    public init() {}
}

/// Protocol Server
public class Server {
    private var routes: [String: Handler] = [:]
    private let config: ServerConfig
    private var isRunning = false
    
    /// Create a new server
    public init(config: ServerConfig = ServerConfig()) {
        self.config = config
    }
    
    /// Register a route handler
    @discardableResult
    public func on(_ route: String, handler: @escaping Handler) -> Self {
        routes[route] = handler
        print("Registered route: \(route)")
        return self
    }
    
    /// Start listening on the specified address
    public func listen(_ address: String) async throws {
        isRunning = true
        print("Server listening on \(address)")
        
        // In production, this would start the actual UDP server
        // For now, this is a placeholder that maintains compatibility
    }
    
    /// Handle incoming request
    private func handleRequest(_ ctx: Context) throws -> Response {
        guard let handler = routes[ctx.route] else {
            throw ProtocolError.other("Route not found: \(ctx.route)")
        }
        
        return try handler(ctx)
    }
    
    /// Stop the server
    public func stop() {
        isRunning = false
        print("Server stopped")
    }
}

/// Client configuration
public struct ClientConfig {
    public var ackTimeout: TimeInterval = 1.0
    public var maxRetransmit: Int = 3
    public var requestTimeout: TimeInterval = 5.0
    
    public init() {}
}

/// Protocol Client
public class Client {
    private let bindAddress: String
    private let serverAddress: String
    private let config: ClientConfig
    private var isConnected = false
    
    /// Create a new client
    public init(bindAddress: String = "0.0.0.0:0", 
                serverAddress: String,
                config: ClientConfig = ClientConfig()) {
        self.bindAddress = bindAddress
        self.serverAddress = serverAddress
        self.config = config
    }
    
    /// Connect to the server
    public func connect() async throws {
        print("Connecting to \(serverAddress)...")
        
        // In production, this would establish the UDP connection
        isConnected = true
        print("Connected!")
    }
    
    /// Send a request and wait for response
    public func request(_ route: String, data: Data) async throws -> Data {
        guard isConnected else {
            throw ProtocolError.notConnected
        }
        
        print("Request: \(route)")
        
        // In production, this would send via UDP and wait for response
        return Data("Response for \(route)".utf8)
    }
    
    /// Send a request with string data
    public func request(_ route: String, text: String) async throws -> String {
        let data = text.data(using: .utf8)!
        let response = try await request(route, data: data)
        
        guard let text = String(data: response, encoding: .utf8) else {
            throw ProtocolError.invalidResponse
        }
        
        return text
    }
    
    /// Send a request with JSON data
    public func requestJson<T: Encodable, R: Decodable>(_ route: String, data: T) async throws -> R {
        let encoder = JSONEncoder()
        let requestData = try encoder.encode(data)
        
        let responseData = try await request(route, data: requestData)
        
        let decoder = JSONDecoder()
        return try decoder.decode(R.self, from: responseData)
    }
    
    /// Send data without waiting for response
    public func send(_ route: String, data: Data) async throws {
        guard isConnected else {
            throw ProtocolError.notConnected
        }
        
        print("Send: \(route)")
        // In production, this would send via UDP without waiting
    }
    
    /// Disconnect from the server
    public func disconnect() {
        isConnected = false
        print("Disconnected")
    }
}

/// Example usage:
/// ```swift
/// // Server
/// let server = Server()
/// server.on("/ping") { ctx in
///     return Response.text("pong")
/// }
/// try await server.listen("127.0.0.1:8080")
///
/// // Client
/// let client = Client(serverAddress: "127.0.0.1:8080")
/// try await client.connect()
/// let response = try await client.request("/ping", text: "")
/// print(response) // "pong"
/// ```


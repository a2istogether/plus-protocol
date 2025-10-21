/**
 * Example iOS app using Fast Protocol
 */

import Foundation
import FastProtocol

// MARK: - Server Example

func runServer() async {
    let server = Server()
    
    // Register routes
    server.on("/ping") { ctx in
        print("Received ping")
        return Response.text("pong")
    }
    
    server.on("/echo") { ctx in
        let message = try ctx.text()
        print("Echo: \(message)")
        return Response.text(message)
    }
    
    server.on("/json") { ctx in
        struct RequestData: Codable {
            let name: String
            let value: Int
        }
        
        struct ResponseData: Codable {
            let message: String
            let received: RequestData
        }
        
        let data: RequestData = try ctx.json()
        print("Received JSON: \(data)")
        
        let response = ResponseData(
            message: "Received",
            received: data
        )
        
        return try Response.json(response)
    }
    
    // Start listening
    do {
        try await server.listen("127.0.0.1:8080")
        print("Server is running!")
        
        // Keep running
        try await Task.sleep(nanoseconds: UInt64.max)
    } catch {
        print("Server error: \(error)")
    }
}

// MARK: - Client Example

func runClient() async {
    let client = Client(serverAddress: "127.0.0.1:8080")
    
    do {
        // Connect
        try await client.connect()
        print("Connected to server")
        
        // Ping test
        print("\n--- Ping Test ---")
        let pingResponse = try await client.request("/ping", text: "")
        print("Response: \(pingResponse)")
        
        // Echo test
        print("\n--- Echo Test ---")
        let echoResponse = try await client.request("/echo", text: "Hello, World!")
        print("Response: \(echoResponse)")
        
        // JSON test
        print("\n--- JSON Test ---")
        struct RequestData: Codable {
            let name: String
            let value: Int
        }
        
        struct ResponseData: Codable {
            let message: String
            let received: RequestData
        }
        
        let requestData = RequestData(name: "Alice", value: 42)
        let jsonResponse: ResponseData = try await client.requestJson("/json", data: requestData)
        print("Response: \(jsonResponse)")
        
        // Disconnect
        client.disconnect()
        print("\nDisconnected")
        
    } catch {
        print("Client error: \(error)")
    }
}

// MARK: - Main

@main
struct FastProtocolExample {
    static func main() async {
        print("Fast Protocol iOS Example")
        print("==========================\n")
        
        // Uncomment to run server or client
        // await runServer()
        await runClient()
    }
}


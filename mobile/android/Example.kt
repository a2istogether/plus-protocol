/**
 * Example Android app using Fast Protocol
 */

package com.fastprotocol.example

import com.fastprotocol.*
import kotlinx.coroutines.*
import kotlinx.serialization.Serializable

// MARK: - Server Example

suspend fun runServer() {
    val server = Server()
    
    // Register routes
    server.on("/ping") { ctx ->
        println("Received ping")
        Response.text("pong")
    }
    
    server.on("/echo") { ctx ->
        val message = ctx.text()
        println("Echo: $message")
        Response.text(message)
    }
    
    server.on("/json") { ctx ->
        @Serializable
        data class RequestData(
            val name: String,
            val value: Int
        )
        
        @Serializable
        data class ResponseData(
            val message: String,
            val received: RequestData
        )
        
        val data = ctx.json<RequestData>()
        println("Received JSON: $data")
        
        val response = ResponseData(
            message = "Received",
            received = data
        )
        
        Response.json(response)
    }
    
    // Start listening
    try {
        server.listen("127.0.0.1:8080")
        println("Server is running!")
        
        // Keep running
        delay(Long.MAX_VALUE)
    } catch (e: Exception) {
        println("Server error: $e")
    }
}

// MARK: - Client Example

suspend fun runClient() {
    val client = Client(serverAddress = "127.0.0.1:8080")
    
    try {
        // Connect
        client.connect()
        println("Connected to server")
        
        // Ping test
        println("\n--- Ping Test ---")
        val pingResponse = client.request("/ping", "")
        println("Response: $pingResponse")
        
        // Echo test
        println("\n--- Echo Test ---")
        val echoResponse = client.request("/echo", "Hello, World!")
        println("Response: $echoResponse")
        
        // JSON test
        println("\n--- JSON Test ---")
        
        @Serializable
        data class RequestData(
            val name: String,
            val value: Int
        )
        
        @Serializable
        data class ResponseData(
            val message: String,
            val received: RequestData
        )
        
        val requestData = RequestData(name = "Alice", value = 42)
        val jsonResponse = client.requestJson<RequestData, ResponseData>("/json", requestData)
        println("Response: $jsonResponse")
        
        // Disconnect
        client.disconnect()
        println("\nDisconnected")
        
    } catch (e: Exception) {
        println("Client error: $e")
    }
}

// MARK: - Main

fun main() = runBlocking {
    println("Fast Protocol Android Example")
    println("==============================\n")
    
    // Uncomment to run server or client
    // runServer()
    runClient()
}


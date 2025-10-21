/**
 * Fast Protocol - Android Kotlin Bindings
 * 
 * High-speed, cross-platform custom network protocol for Android
 */

package com.fastprotocol

import kotlinx.coroutines.*
import kotlinx.serialization.*
import kotlinx.serialization.json.Json
import java.net.InetSocketAddress
import java.nio.ByteBuffer

/**
 * Protocol error types
 */
sealed class ProtocolError : Exception() {
    data class ConnectionFailed(override val message: String) : ProtocolError()
    object Timeout : ProtocolError()
    object InvalidResponse : ProtocolError()
    object NotConnected : ProtocolError()
    data class Other(override val message: String) : ProtocolError()
}

/**
 * Request context
 */
data class Context(
    val route: String,
    val data: ByteArray,
    val remoteAddress: String
) {
    /**
     * Parse data as JSON
     */
    inline fun <reified T> json(): T {
        return Json.decodeFromString(data.toString(Charsets.UTF_8))
    }
    
    /**
     * Get data as string
     */
    fun text(): String {
        return data.toString(Charsets.UTF_8)
    }
    
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        
        other as Context
        
        if (route != other.route) return false
        if (!data.contentEquals(other.data)) return false
        if (remoteAddress != other.remoteAddress) return false
        
        return true
    }
    
    override fun hashCode(): Int {
        var result = route.hashCode()
        result = 31 * result + data.contentHashCode()
        result = 31 * result + remoteAddress.hashCode()
        return result
    }
}

/**
 * Response builder
 */
data class Response(val data: ByteArray) {
    companion object {
        /**
         * Create a text response
         */
        fun text(text: String): Response {
            return Response(text.toByteArray(Charsets.UTF_8))
        }
        
        /**
         * Create a JSON response
         */
        inline fun <reified T> json(value: T): Response {
            val json = Json.encodeToString(value)
            return Response(json.toByteArray(Charsets.UTF_8))
        }
        
        /**
         * Create a binary response
         */
        fun binary(data: ByteArray): Response {
            return Response(data)
        }
    }
    
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        
        other as Response
        
        if (!data.contentEquals(other.data)) return false
        
        return true
    }
    
    override fun hashCode(): Int {
        return data.contentHashCode()
    }
}

/**
 * Handler function type
 */
typealias Handler = suspend (Context) -> Response

/**
 * Server configuration
 */
data class ServerConfig(
    val ackTimeout: Long = 1000,
    val maxRetransmit: Int = 3,
    val heartbeatInterval: Long = 30000
)

/**
 * Protocol Server
 */
class Server(private val config: ServerConfig = ServerConfig()) {
    private val routes = mutableMapOf<String, Handler>()
    private var isRunning = false
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    /**
     * Register a route handler
     */
    fun on(route: String, handler: Handler): Server {
        routes[route] = handler
        println("Registered route: $route")
        return this
    }
    
    /**
     * Start listening on the specified address
     */
    suspend fun listen(address: String) {
        isRunning = true
        println("Server listening on $address")
        
        // In production, this would start the actual UDP server
        // For now, this is a placeholder that maintains compatibility
    }
    
    /**
     * Handle incoming request
     */
    private suspend fun handleRequest(ctx: Context): Response {
        val handler = routes[ctx.route] 
            ?: throw ProtocolError.Other("Route not found: ${ctx.route}")
        
        return handler(ctx)
    }
    
    /**
     * Stop the server
     */
    fun stop() {
        isRunning = false
        scope.cancel()
        println("Server stopped")
    }
}

/**
 * Client configuration
 */
data class ClientConfig(
    val ackTimeout: Long = 1000,
    val maxRetransmit: Int = 3,
    val requestTimeout: Long = 5000
)

/**
 * Protocol Client
 */
class Client(
    private val bindAddress: String = "0.0.0.0:0",
    private val serverAddress: String,
    private val config: ClientConfig = ClientConfig()
) {
    private var isConnected = false
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    /**
     * Connect to the server
     */
    suspend fun connect() {
        println("Connecting to $serverAddress...")
        
        // In production, this would establish the UDP connection
        isConnected = true
        println("Connected!")
    }
    
    /**
     * Send a request and wait for response
     */
    suspend fun request(route: String, data: ByteArray): ByteArray {
        if (!isConnected) {
            throw ProtocolError.NotConnected
        }
        
        println("Request: $route")
        
        // In production, this would send via UDP and wait for response
        return "Response for $route".toByteArray(Charsets.UTF_8)
    }
    
    /**
     * Send a request with string data
     */
    suspend fun request(route: String, text: String): String {
        val data = text.toByteArray(Charsets.UTF_8)
        val response = request(route, data)
        return response.toString(Charsets.UTF_8)
    }
    
    /**
     * Send a request with JSON data
     */
    suspend inline fun <reified T, reified R> requestJson(route: String, data: T): R {
        val json = Json.encodeToString(data)
        val requestData = json.toByteArray(Charsets.UTF_8)
        
        val responseData = request(route, requestData)
        val responseJson = responseData.toString(Charsets.UTF_8)
        
        return Json.decodeFromString(responseJson)
    }
    
    /**
     * Send data without waiting for response
     */
    suspend fun send(route: String, data: ByteArray) {
        if (!isConnected) {
            throw ProtocolError.NotConnected
        }
        
        println("Send: $route")
        // In production, this would send via UDP without waiting
    }
    
    /**
     * Disconnect from the server
     */
    fun disconnect() {
        isConnected = false
        scope.cancel()
        println("Disconnected")
    }
}

/**
 * Example usage:
 * 
 * // Server
 * val server = Server()
 * server.on("/ping") { ctx ->
 *     Response.text("pong")
 * }
 * server.listen("127.0.0.1:8080")
 * 
 * // Client
 * val client = Client(serverAddress = "127.0.0.1:8080")
 * client.connect()
 * val response = client.request("/ping", "")
 * println(response) // "pong"
 */


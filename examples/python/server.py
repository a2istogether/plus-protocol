#!/usr/bin/env python3
"""
Python server example using Fast Protocol

This is a conceptual example showing how Python bindings would work.
In production, you would use PyO3 to create actual Python bindings.
"""

import asyncio
import json


class Server:
    """Fast Protocol Server"""
    
    def __init__(self, config=None):
        self.routes = {}
        self.config = config or {}
    
    def on(self, route, handler):
        """Register a route handler"""
        self.routes[route] = handler
        print(f"Registered route: {route}")
        return self
    
    async def listen(self, address):
        """Start listening on the specified address"""
        print(f"Server listening on {address}")
        print("\nRoutes:")
        for route in self.routes:
            print(f"  - {route}")
        print("\nPress Ctrl+C to stop\n")
        
        # In production, this would start the actual server
        # For now, keep running
        try:
            await asyncio.Event().wait()
        except KeyboardInterrupt:
            print("\nServer stopped")


class Context:
    """Request context"""
    
    def __init__(self, route, data, remote_addr):
        self.route = route
        self.data = data
        self.remote_addr = remote_addr
    
    def json(self):
        """Parse data as JSON"""
        return json.loads(self.data.decode('utf-8'))
    
    def text(self):
        """Get data as string"""
        return self.data.decode('utf-8')


class Response:
    """Response builder"""
    
    def __init__(self, data):
        self.data = data
    
    @staticmethod
    def text(text):
        """Create a text response"""
        return Response(text.encode('utf-8'))
    
    @staticmethod
    def json(obj):
        """Create a JSON response"""
        return Response(json.dumps(obj).encode('utf-8'))
    
    @staticmethod
    def binary(data):
        """Create a binary response"""
        return Response(data)


async def main():
    server = Server()
    
    # Register /ping handler
    @server.on('/ping')
    async def ping(ctx):
        print("Received ping")
        return Response.text("pong")
    
    # Register /echo handler
    @server.on('/echo')
    async def echo(ctx):
        message = ctx.text()
        print(f"Echo: {message}")
        return Response.text(message)
    
    # Register /json handler
    @server.on('/json')
    async def json_handler(ctx):
        data = ctx.json()
        print(f"Received JSON: {data}")
        
        response = {
            "message": "Received",
            "echo": data,
            "timestamp": asyncio.get_event_loop().time()
        }
        
        return Response.json(response)
    
    # Register /uppercase handler
    @server.on('/uppercase')
    async def uppercase(ctx):
        text = ctx.text()
        return Response.text(text.upper())
    
    # Register /reverse handler
    @server.on('/reverse')
    async def reverse(ctx):
        text = ctx.text()
        return Response.text(text[::-1])
    
    # Start listening
    await server.listen('127.0.0.1:8080')


if __name__ == '__main__':
    asyncio.run(main())


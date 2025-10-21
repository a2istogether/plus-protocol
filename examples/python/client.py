#!/usr/bin/env python3
"""
Python client example using Fast Protocol

This is a conceptual example showing how Python bindings would work.
In production, you would use PyO3 to create actual Python bindings.
"""

import asyncio
import json


class Client:
    """Fast Protocol Client"""
    
    def __init__(self, server_address, bind_address='0.0.0.0:0', config=None):
        self.bind_address = bind_address
        self.server_address = server_address
        self.config = config or {}
        self.connected = False
    
    async def connect(self):
        """Connect to the server"""
        print(f"Connecting to {self.server_address}...")
        # In production, this would establish the connection
        self.connected = True
        print("Connected!")
    
    async def request(self, route, data):
        """Send a request and wait for response"""
        if not self.connected:
            raise Exception("Not connected")
        
        if isinstance(data, str):
            data = data.encode('utf-8')
        
        print(f"Request: {route}")
        
        # In production, this would send via UDP and wait for response
        return f"Response for {route}".encode('utf-8')
    
    async def request_json(self, route, data):
        """Send a JSON request"""
        json_data = json.dumps(data)
        response = await self.request(route, json_data)
        return json.loads(response.decode('utf-8'))
    
    async def send(self, route, data):
        """Send data without waiting for response"""
        if not self.connected:
            raise Exception("Not connected")
        
        print(f"Send: {route}")
        # In production, this would send via UDP without waiting
    
    def disconnect(self):
        """Disconnect from the server"""
        self.connected = False
        print("Disconnected")


async def main():
    client = Client(server_address='127.0.0.1:8080')
    
    # Connect
    await client.connect()
    print()
    
    # Ping test
    print("--- Ping Test ---")
    response = await client.request('/ping', '')
    print(f"Response: {response.decode('utf-8')}\n")
    
    # Echo test
    print("--- Echo Test ---")
    response = await client.request('/echo', 'Hello, World!')
    print(f"Response: {response.decode('utf-8')}\n")
    
    # JSON test
    print("--- JSON Test ---")
    data = {
        'name': 'Alice',
        'age': 30,
        'message': 'Hello from Python!'
    }
    response = await client.request_json('/json', data)
    print(f"Response: {response}\n")
    
    # Uppercase test
    print("--- Uppercase Test ---")
    response = await client.request('/uppercase', 'hello world')
    print(f"Response: {response.decode('utf-8')}\n")
    
    # Reverse test
    print("--- Reverse Test ---")
    response = await client.request('/reverse', 'stressed desserts')
    print(f"Response: {response.decode('utf-8')}\n")
    
    print("All tests completed successfully!")
    
    # Disconnect
    client.disconnect()


if __name__ == '__main__':
    asyncio.run(main())


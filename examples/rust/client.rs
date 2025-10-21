//! Rust client example

use fast_protocol::Client;
use bytes::Bytes;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    println!("Creating client...");

    // Create client
    let client = Arc::new(
        Client::new(
            "127.0.0.1:0",
            "127.0.0.1:8080".parse()?,
            Default::default(),
        ).await?
    );

    // Start receive loop
    let client_clone = client.clone();
    tokio::spawn(async move {
        if let Err(e) = client_clone.start_recv_loop().await {
            eprintln!("Recv loop error: {}", e);
        }
    });

    // Connect to server
    println!("Connecting to server...");
    client.connect().await?;
    println!("Connected!\n");

    // Give some time for connection to establish
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Ping test
    println!("--- Ping Test ---");
    let response = client.request("/ping", Bytes::new()).await?;
    println!("Response: {}\n", String::from_utf8_lossy(&response));

    // Echo test
    println!("--- Echo Test ---");
    let response = client.request("/echo", Bytes::from("Hello, World!")).await?;
    println!("Response: {}\n", String::from_utf8_lossy(&response));

    // JSON test
    println!("--- JSON Test ---");
    use serde::{Deserialize, Serialize};

    #[derive(Serialize)]
    struct Request {
        name: String,
        value: i32,
    }

    let req = Request {
        name: "Alice".to_string(),
        value: 42,
    };

    let json = serde_json::to_vec(&req)?;
    let response = client.request("/json", Bytes::from(json)).await?;
    println!("Response: {}\n", String::from_utf8_lossy(&response));

    // Uppercase test
    println!("--- Uppercase Test ---");
    let response = client.request("/uppercase", Bytes::from("hello world")).await?;
    println!("Response: {}\n", String::from_utf8_lossy(&response));

    // Reverse test
    println!("--- Reverse Test ---");
    let response = client.request("/reverse", Bytes::from("stressed desserts")).await?;
    println!("Response: {}\n", String::from_utf8_lossy(&response));

    println!("All tests completed successfully!");

    Ok(())
}


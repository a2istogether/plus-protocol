//! Rust server example

use fast_protocol::{Server, Response, middleware::*};
use bytes::Bytes;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Create server
    let server = Arc::new(
        Server::new(
            "127.0.0.1:8080",
            Default::default(),
        ).await?
    );

    println!("Setting up routes...");

    // Register /ping handler
    server.on_async("/ping", |_ctx: Context| async {
        println!("Received ping");
        Ok(Response::text("pong"))
    }).await;

    // Register /echo handler
    server.on_async("/echo", |ctx: Context| async {
        let message = ctx.text()?;
        println!("Echo: {}", message);
        Ok(Response::text(message))
    }).await;

    // Register /json handler
    server.on_async("/json", |ctx: Context| async {
        use serde::{Deserialize, Serialize};

        #[derive(Deserialize)]
        struct Request {
            name: String,
            value: i32,
        }

        #[derive(Serialize)]
        struct ResponseData {
            message: String,
            received: String,
            timestamp: u64,
        }

        let req: Request = ctx.json()?;
        println!("Received JSON: name={}, value={}", req.name, req.value);

        let resp = ResponseData {
            message: "Received".to_string(),
            received: req.name,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        };

        Response::json(&resp)
    }).await;

    // Register /uppercase handler
    server.on_async("/uppercase", |ctx: Context| async {
        let text = ctx.text()?;
        let upper = text.to_uppercase();
        Ok(Response::text(upper))
    }).await;

    // Register /reverse handler
    server.on_async("/reverse", |ctx: Context| async {
        let text = ctx.text()?;
        let reversed: String = text.chars().rev().collect();
        Ok(Response::text(reversed))
    }).await;

    println!("\nServer listening on 127.0.0.1:8080");
    println!("Routes:");
    println!("  - /ping");
    println!("  - /echo");
    println!("  - /json");
    println!("  - /uppercase");
    println!("  - /reverse");
    println!("\nPress Ctrl+C to stop\n");

    // Start listening
    server.listen().await?;

    Ok(())
}


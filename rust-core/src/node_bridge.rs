//! Node.js N-API bindings

#[cfg(feature = "nodejs")]
use neon::prelude::*;
use neon::types::buffer::TypedArray;
use std::sync::Arc;
use tokio::runtime::Runtime;

use crate::{
    server::Server,
    client::Client,
    transport::TransportConfig,
    crypto::CryptoProvider,
    compression::CompressionProvider,
    middleware::{Context, Response},
};

/// Wrapper for Server that can be stored in JS
struct ServerWrapper {
    server: Arc<Server>,
    runtime: Arc<Runtime>,
}

impl Finalize for ServerWrapper {}

/// Wrapper for Client that can be stored in JS
struct ClientWrapper {
    client: Arc<Client>,
    runtime: Arc<Runtime>,
}

impl Finalize for ClientWrapper {}

/// Create a new server
fn create_server(mut cx: FunctionContext) -> JsResult<JsBox<ServerWrapper>> {
    let addr = cx.argument::<JsString>(0)?.value(&mut cx);
    
    let runtime = Arc::new(
        Runtime::new().or_else(|e| cx.throw_error(format!("Failed to create runtime: {}", e)))?
    );

    let server = runtime.block_on(async {
        let config = TransportConfig::default();
        Server::new(addr.parse().unwrap(), config).await
    }).or_else(|e| cx.throw_error(format!("Failed to create server: {}", e)))?;

    let wrapper = ServerWrapper {
        server: Arc::new(server),
        runtime,
    };

    Ok(cx.boxed(wrapper))
}

/// Register a route handler
fn server_on(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let wrapper = cx.argument::<JsBox<ServerWrapper>>(0)?;
    let route = cx.argument::<JsString>(1)?.value(&mut cx);
    let callback = cx.argument::<JsFunction>(2)?.root(&mut cx);

    let server = wrapper.server.clone();
    let runtime = wrapper.runtime.clone();

    runtime.spawn(async move {
        server.on_async(route, move |ctx: Context| {
            let callback = callback.clone();
            async move {
                // For now, return a simple response
                // In a full implementation, we'd call the JS callback here
                Ok(Response::text("OK"))
            }
        }).await;
    });

    Ok(cx.undefined())
}

/// Start server listening
fn server_listen(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let wrapper = cx.argument::<JsBox<ServerWrapper>>(0)?;
    
    let server = wrapper.server.clone();
    let runtime = wrapper.runtime.clone();

    runtime.spawn(async move {
        if let Err(e) = server.listen().await {
            eprintln!("Server error: {}", e);
        }
    });

    Ok(cx.undefined())
}

/// Create a new client
fn create_client(mut cx: FunctionContext) -> JsResult<JsBox<ClientWrapper>> {
    let bind_addr = cx.argument::<JsString>(0)?.value(&mut cx);
    let server_addr = cx.argument::<JsString>(1)?.value(&mut cx);
    
    let runtime = Arc::new(
        Runtime::new().or_else(|e| cx.throw_error(format!("Failed to create runtime: {}", e)))?
    );

    let client = runtime.block_on(async {
        let config = TransportConfig::default();
        Client::new(
            bind_addr.parse().unwrap(),
            server_addr.parse().unwrap(),
            config,
        ).await
    }).or_else(|e| cx.throw_error(format!("Failed to create client: {}", e)))?;

    let wrapper = ClientWrapper {
        client: Arc::new(client),
        runtime,
    };

    Ok(cx.boxed(wrapper))
}

/// Connect client to server
fn client_connect(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let wrapper = cx.argument::<JsBox<ClientWrapper>>(0)?;
    let channel = cx.channel();

    let client = wrapper.client.clone();
    let runtime = wrapper.runtime.clone();

    let (deferred, promise) = cx.promise();

    runtime.spawn(async move {
        let result = client.connect().await;
        
        deferred.settle_with(&channel, move |mut cx| {
            match result {
                Ok(_) => Ok(cx.undefined()),
                Err(e) => cx.throw_error(format!("Connection failed: {}", e)),
            }
        });
    });

    Ok(promise)
}

/// Send a request
fn client_request(mut cx: FunctionContext) -> JsResult<JsPromise> {
    let wrapper = cx.argument::<JsBox<ClientWrapper>>(0)?;
    let route = cx.argument::<JsString>(1)?.value(&mut cx);
    let data = cx.argument::<JsString>(2)?.value(&mut cx);
    let channel = cx.channel();

    let client = wrapper.client.clone();
    let runtime = wrapper.runtime.clone();

    let (deferred, promise) = cx.promise();

    runtime.spawn(async move {
        let result = client.request(route, data.into()).await;
        
        deferred.settle_with(&channel, move |mut cx| {
            match result {
                Ok(bytes) => {
                    let s = String::from_utf8_lossy(&bytes);
                    Ok(cx.string(s))
                }
                Err(e) => cx.throw_error(format!("Request failed: {}", e)),
            }
        });
    });

    Ok(promise)
}

/// Export all functions to Node.js
#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("createServer", create_server)?;
    cx.export_function("serverOn", server_on)?;
    cx.export_function("serverListen", server_listen)?;
    cx.export_function("createClient", create_client)?;
    cx.export_function("clientConnect", client_connect)?;
    cx.export_function("clientRequest", client_request)?;
    Ok(())
}


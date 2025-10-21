//! WebAssembly bindings for browser

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;
#[cfg(feature = "wasm")]
use wasm_bindgen_futures::spawn_local;
#[cfg(feature = "wasm")]
use js_sys::{Promise, Uint8Array};
#[cfg(feature = "wasm")]
use web_sys::{WebSocket, MessageEvent};
#[cfg(feature = "wasm")]
use std::sync::Arc;
#[cfg(feature = "wasm")]
use tokio::sync::RwLock;
#[cfg(feature = "wasm")]
use bytes::Bytes;
#[cfg(feature = "wasm")]
use std::collections::HashMap;

/// WASM Client for browser
#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub struct WasmClient {
    ws: Option<WebSocket>,
    handlers: Arc<RwLock<HashMap<String, js_sys::Function>>>,
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl WasmClient {
    /// Create a new WASM client
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_error_panic_hook::set_once();
        
        Self {
            ws: None,
            handlers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Connect to server via WebSocket
    pub async fn connect(&mut self, url: String) -> Result<(), JsValue> {
        let ws = WebSocket::new(&url)?;
        ws.set_binary_type(web_sys::BinaryType::Arraybuffer);
        
        self.ws = Some(ws);
        Ok(())
    }

    /// Register a route handler
    pub async fn on(&self, route: String, handler: js_sys::Function) {
        self.handlers.write().await.insert(route, handler);
    }

    /// Send a request
    pub async fn request(&self, route: String, data: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        if let Some(ws) = &self.ws {
            // In a full implementation, this would send via WebSocket
            // and wait for response
            ws.send_with_u8_array(&data)?;
        }
        
        Ok(vec![])
    }

    /// Disconnect
    pub fn disconnect(&mut self) -> Result<(), JsValue> {
        if let Some(ws) = &self.ws {
            ws.close()?;
        }
        self.ws = None;
        Ok(())
    }
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn init_logging() {
    console_error_panic_hook::set_once();
}


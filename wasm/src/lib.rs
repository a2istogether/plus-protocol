//! WASM bindings for browser usage

use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{WebSocket, MessageEvent, ErrorEvent, CloseEvent};
use js_sys::{Uint8Array, Promise};
use std::sync::Arc;
use std::cell::RefCell;
use std::rc::Rc;
use std::collections::HashMap;

/// Initialize panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Log to browser console
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// Handler function type
type Handler = js_sys::Function;

/// Protocol client for browser
#[wasm_bindgen]
pub struct ProtocolClient {
    ws: Option<WebSocket>,
    handlers: Rc<RefCell<HashMap<String, Handler>>>,
    connected: bool,
}

#[wasm_bindgen]
impl ProtocolClient {
    /// Create a new protocol client
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            ws: None,
            handlers: Rc::new(RefCell::new(HashMap::new())),
            connected: false,
        }
    }

    /// Connect to server via WebSocket
    pub async fn connect(&mut self, url: String) -> Result<(), JsValue> {
        log(&format!("Connecting to {}...", url));
        
        let ws = WebSocket::new(&url)?;
        ws.set_binary_type(web_sys::BinaryType::Arraybuffer);
        
        // Setup event handlers
        let handlers = self.handlers.clone();
        
        let onmessage_callback = Closure::wrap(Box::new(move |e: MessageEvent| {
            if let Ok(arraybuf) = e.data().dyn_into::<js_sys::ArrayBuffer>() {
                let array = Uint8Array::new(&arraybuf);
                let data = array.to_vec();
                
                // Parse message and call handler
                // In production, this would parse the protocol packet
                log(&format!("Received {} bytes", data.len()));
            }
        }) as Box<dyn FnMut(MessageEvent)>);
        
        ws.set_onmessage(Some(onmessage_callback.as_ref().unchecked_ref()));
        onmessage_callback.forget();
        
        let onerror_callback = Closure::wrap(Box::new(move |e: ErrorEvent| {
            log(&format!("WebSocket error: {:?}", e));
        }) as Box<dyn FnMut(ErrorEvent)>);
        
        ws.set_onerror(Some(onerror_callback.as_ref().unchecked_ref()));
        onerror_callback.forget();
        
        let onclose_callback = Closure::wrap(Box::new(move |e: CloseEvent| {
            log(&format!("WebSocket closed: {}", e.code()));
        }) as Box<dyn FnMut(CloseEvent)>);
        
        ws.set_onclose(Some(onclose_callback.as_ref().unchecked_ref()));
        onclose_callback.forget();
        
        self.ws = Some(ws);
        self.connected = true;
        
        log("Connected!");
        Ok(())
    }

    /// Register a route handler
    pub fn on(&mut self, route: String, handler: Handler) {
        log(&format!("Registered handler for {}", route));
        self.handlers.borrow_mut().insert(route, handler);
    }

    /// Send a request
    pub fn request(&self, route: String, data: Vec<u8>) -> Result<Promise, JsValue> {
        if !self.connected {
            return Err(JsValue::from_str("Not connected"));
        }
        
        log(&format!("Sending request to {} ({} bytes)", route, data.len()));
        
        if let Some(ws) = &self.ws {
            ws.send_with_u8_array(&data)?;
        }
        
        // Create a promise that resolves with the response
        let promise = Promise::new(&mut |resolve, reject| {
            // In production, this would wait for the actual response
            resolve.call1(&JsValue::NULL, &JsValue::from_str("Response")).unwrap();
        });
        
        Ok(promise)
    }

    /// Send data without waiting for response
    pub fn send(&self, route: String, data: Vec<u8>) -> Result<(), JsValue> {
        if !self.connected {
            return Err(JsValue::from_str("Not connected"));
        }
        
        if let Some(ws) = &self.ws {
            ws.send_with_u8_array(&data)?;
        }
        
        Ok(())
    }

    /// Disconnect
    pub fn disconnect(&mut self) -> Result<(), JsValue> {
        if let Some(ws) = &self.ws {
            ws.close()?;
        }
        self.ws = None;
        self.connected = false;
        log("Disconnected");
        Ok(())
    }

    /// Check if connected
    pub fn is_connected(&self) -> bool {
        self.connected
    }
}

/// Helper function to encode string to bytes
#[wasm_bindgen]
pub fn encode_string(s: String) -> Vec<u8> {
    s.into_bytes()
}

/// Helper function to decode bytes to string
#[wasm_bindgen]
pub fn decode_string(data: Vec<u8>) -> Result<String, JsValue> {
    String::from_utf8(data)
        .map_err(|e| JsValue::from_str(&format!("UTF-8 error: {}", e)))
}

/// Helper function to encode JSON
#[wasm_bindgen]
pub fn encode_json(value: &JsValue) -> Result<Vec<u8>, JsValue> {
    let json = js_sys::JSON::stringify(value)?;
    Ok(json.as_string().unwrap().into_bytes())
}

/// Helper function to decode JSON
#[wasm_bindgen]
pub fn decode_json(data: Vec<u8>) -> Result<JsValue, JsValue> {
    let s = String::from_utf8(data)
        .map_err(|e| JsValue::from_str(&format!("UTF-8 error: {}", e)))?;
    js_sys::JSON::parse(&s)
}


//! Middleware and handler support

use async_trait::async_trait;
use bytes::Bytes;
use std::net::SocketAddr;
use std::sync::Arc;

use crate::error::*;
use crate::packet::Packet;

/// Request context
#[derive(Debug, Clone)]
pub struct Context {
    pub route: String,
    pub payload: Bytes,
    pub remote_addr: SocketAddr,
    pub packet: Packet,
}

impl Context {
    /// Parse JSON payload
    pub fn json<T: serde::de::DeserializeOwned>(&self) -> Result<T> {
        serde_json::from_slice(&self.payload)
            .map_err(|e| ProtocolError::Other(format!("JSON parse error: {}", e)))
    }

    /// Get payload as string
    pub fn text(&self) -> Result<String> {
        String::from_utf8(self.payload.to_vec())
            .map_err(|e| ProtocolError::Other(format!("UTF-8 error: {}", e)))
    }
}

/// Response builder
#[derive(Debug, Clone)]
pub struct Response {
    pub data: Bytes,
}

impl Response {
    /// Create a new response with bytes
    pub fn new(data: Bytes) -> Self {
        Self { data }
    }

    /// Create a response from string
    pub fn text(text: impl Into<String>) -> Self {
        Self {
            data: Bytes::from(text.into().into_bytes()),
        }
    }

    /// Create a JSON response
    pub fn json<T: serde::Serialize>(value: &T) -> Result<Self> {
        let json = serde_json::to_vec(value)
            .map_err(|e| ProtocolError::Other(format!("JSON serialization error: {}", e)))?;
        Ok(Self {
            data: Bytes::from(json),
        })
    }
}

/// Handler function type
pub type HandlerFn = Arc<dyn Fn(Context) -> Result<Response> + Send + Sync>;

/// Async handler trait
#[async_trait]
pub trait Handler: Send + Sync {
    async fn handle(&self, ctx: Context) -> Result<Response>;
}

/// Function-based handler wrapper
pub struct FnHandler<F>
where
    F: Fn(Context) -> Result<Response> + Send + Sync,
{
    func: F,
}

impl<F> FnHandler<F>
where
    F: Fn(Context) -> Result<Response> + Send + Sync,
{
    pub fn new(func: F) -> Self {
        Self { func }
    }
}

#[async_trait]
impl<F> Handler for FnHandler<F>
where
    F: Fn(Context) -> Result<Response> + Send + Sync,
{
    async fn handle(&self, ctx: Context) -> Result<Response> {
        (self.func)(ctx)
    }
}

/// Async function-based handler wrapper
pub struct AsyncFnHandler<F, Fut>
where
    F: Fn(Context) -> Fut + Send + Sync,
    Fut: std::future::Future<Output = Result<Response>> + Send,
{
    func: F,
}

impl<F, Fut> AsyncFnHandler<F, Fut>
where
    F: Fn(Context) -> Fut + Send + Sync,
    Fut: std::future::Future<Output = Result<Response>> + Send,
{
    pub fn new(func: F) -> Self {
        Self { func }
    }
}

#[async_trait]
impl<F, Fut> Handler for AsyncFnHandler<F, Fut>
where
    F: Fn(Context) -> Fut + Send + Sync,
    Fut: std::future::Future<Output = Result<Response>> + Send,
{
    async fn handle(&self, ctx: Context) -> Result<Response> {
        (self.func)(ctx).await
    }
}

/// Middleware trait
#[async_trait]
pub trait Middleware: Send + Sync {
    async fn process(&self, ctx: &mut Context, next: Next<'_>) -> Result<Response>;
}

/// Next middleware in chain
pub struct Next<'a> {
    pub(crate) handler: &'a dyn Handler,
}

impl<'a> Next<'a> {
    pub async fn run(self, ctx: Context) -> Result<Response> {
        self.handler.handle(ctx).await
    }
}

/// Logging middleware
pub struct LoggingMiddleware;

#[async_trait]
impl Middleware for LoggingMiddleware {
    async fn process(&self, ctx: &mut Context, next: Next<'_>) -> Result<Response> {
        tracing::info!("Request: {} from {}", ctx.route, ctx.remote_addr);
        let response = next.run(ctx.clone()).await?;
        tracing::info!("Response: {} bytes", response.data.len());
        Ok(response)
    }
}


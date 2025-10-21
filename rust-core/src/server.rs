//! Server implementation

use bytes::Bytes;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, error, debug};

use crate::transport::{Transport, TransportConfig};
use crate::middleware::{Context, Response, Handler, AsyncFnHandler};
use crate::packet::{Packet, PacketType};
use crate::crypto::CryptoProvider;
use crate::compression::CompressionProvider;
use crate::error::*;

/// Route handler type
type RouteHandler = Arc<dyn Handler>;

/// Server for handling incoming connections
pub struct Server {
    transport: Arc<Transport>,
    routes: Arc<RwLock<HashMap<String, RouteHandler>>>,
}

impl Server {
    /// Create a new server
    pub async fn new(addr: impl Into<SocketAddr>, config: TransportConfig) -> Result<Self> {
        let transport = Transport::bind(addr, config).await?;
        
        Ok(Self {
            transport: Arc::new(transport),
            routes: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    /// Set encryption provider
    pub fn set_crypto(&mut self, crypto: CryptoProvider) {
        Arc::get_mut(&mut self.transport)
            .unwrap()
            .set_crypto(crypto);
    }

    /// Set compression provider
    pub fn set_compression(&mut self, compression: CompressionProvider) {
        Arc::get_mut(&mut self.transport)
            .unwrap()
            .set_compression(compression);
    }

    /// Register a route handler
    pub async fn on<H>(&self, route: impl Into<String>, handler: H)
    where
        H: Handler + 'static,
    {
        let route = route.into();
        info!("Registered route: {}", route);
        self.routes.write().await.insert(route, Arc::new(handler));
    }

    /// Register a synchronous function handler
    pub async fn on_fn<F>(&self, route: impl Into<String>, handler: F)
    where
        F: Fn(Context) -> Result<Response> + Send + Sync + 'static,
    {
        let route = route.into();
        info!("Registered route: {}", route);
        let handler = crate::middleware::FnHandler::new(handler);
        self.routes.write().await.insert(route, Arc::new(handler));
    }

    /// Register an async function handler
    pub async fn on_async<F, Fut>(&self, route: impl Into<String>, handler: F)
    where
        F: Fn(Context) -> Fut + Send + Sync + 'static,
        Fut: std::future::Future<Output = Result<Response>> + Send + 'static,
    {
        let route = route.into();
        info!("Registered route: {}", route);
        let handler = AsyncFnHandler::new(handler);
        self.routes.write().await.insert(route, Arc::new(handler));
    }

    /// Start listening for incoming packets
    pub async fn listen(self: Arc<Self>) -> Result<()> {
        let addr = self.transport.local_addr()?;
        info!("Server listening on {}", addr);

        // Start retransmission task
        self.transport.clone().start_retransmission_task().await;

        loop {
            match self.transport.recv().await {
                Ok((packet, remote_addr)) => {
                    let server = self.clone();
                    tokio::spawn(async move {
                        if let Err(e) = server.handle_packet(packet, remote_addr).await {
                            error!("Error handling packet: {}", e);
                        }
                    });
                }
                Err(e) => {
                    error!("Error receiving packet: {}", e);
                }
            }
        }
    }

    /// Handle an incoming packet
    async fn handle_packet(&self, packet: Packet, remote_addr: SocketAddr) -> Result<()> {
        match packet.packet_type {
            PacketType::Data => {
                debug!("Received data packet: route={}, seq={}", packet.route, packet.sequence);
                
                let ctx = Context {
                    route: packet.route.clone(),
                    payload: packet.payload.clone(),
                    remote_addr,
                    packet: packet.clone(),
                };

                let routes = self.routes.read().await;
                if let Some(handler) = routes.get(&packet.route) {
                    match handler.handle(ctx).await {
                        Ok(response) => {
                            // Send response back
                            self.transport
                                .send_reliable(packet.route, response.data, remote_addr)
                                .await?;
                        }
                        Err(e) => {
                            error!("Handler error: {}", e);
                            // Send error response
                            let error_msg = format!("Error: {}", e);
                            self.transport
                                .send_reliable(
                                    packet.route,
                                    Bytes::from(error_msg),
                                    remote_addr,
                                )
                                .await?;
                        }
                    }
                } else {
                    error!("Route not found: {}", packet.route);
                    let error_msg = format!("Route not found: {}", packet.route);
                    self.transport
                        .send_reliable(packet.route, Bytes::from(error_msg), remote_addr)
                        .await?;
                }
            }
            PacketType::Ack => {
                self.transport.handle_ack(packet.sequence).await;
            }
            PacketType::Nack => {
                self.transport.handle_nack(packet.sequence).await;
            }
            PacketType::Heartbeat => {
                debug!("Received heartbeat from {}", remote_addr);
                // Send heartbeat response
                let heartbeat = Packet::new_heartbeat();
                self.transport.send(heartbeat, remote_addr).await?;
            }
            PacketType::Connect => {
                info!("Connection request from {}", remote_addr);
                let response = Packet {
                    version: crate::PROTOCOL_VERSION,
                    packet_type: PacketType::ConnectAck,
                    flags: Default::default(),
                    sequence: 0,
                    timestamp: 0,
                    route: String::new(),
                    payload: Bytes::new(),
                };
                self.transport.send(response, remote_addr).await?;
            }
            PacketType::Disconnect => {
                info!("Disconnect from {}", remote_addr);
            }
            _ => {
                debug!("Unhandled packet type: {:?}", packet.packet_type);
            }
        }

        Ok(())
    }

    /// Get server local address
    pub fn local_addr(&self) -> Result<SocketAddr> {
        self.transport.local_addr()
    }
}


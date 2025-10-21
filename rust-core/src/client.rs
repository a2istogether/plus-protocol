//! Client implementation

use bytes::Bytes;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock, oneshot};
use tokio::time::{timeout, Duration};
use tracing::{info, error, debug};

use crate::transport::{Transport, TransportConfig};
use crate::packet::{Packet, PacketType};
use crate::crypto::CryptoProvider;
use crate::compression::CompressionProvider;
use crate::error::*;

/// Pending request waiting for response
struct PendingRequest {
    tx: oneshot::Sender<Bytes>,
}

/// Client for making requests
pub struct Client {
    transport: Arc<Transport>,
    server_addr: SocketAddr,
    pending_requests: Arc<RwLock<HashMap<u32, PendingRequest>>>,
    request_timeout: Duration,
}

impl Client {
    /// Create a new client
    pub async fn new(
        bind_addr: impl Into<SocketAddr>,
        server_addr: SocketAddr,
        config: TransportConfig,
    ) -> Result<Self> {
        let transport = Transport::bind(bind_addr, config).await?;
        
        let client = Self {
            transport: Arc::new(transport),
            server_addr,
            pending_requests: Arc::new(RwLock::new(HashMap::new())),
            request_timeout: Duration::from_secs(5),
        };

        Ok(client)
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

    /// Connect to the server
    pub async fn connect(&self) -> Result<()> {
        info!("Connecting to {}", self.server_addr);
        
        let connect_packet = Packet::new_connect();
        self.transport.send(connect_packet, self.server_addr).await?;

        // Wait for ConnectAck
        let start = std::time::Instant::now();
        while start.elapsed() < Duration::from_secs(5) {
            match timeout(Duration::from_millis(100), self.transport.recv()).await {
                Ok(Ok((packet, _))) => {
                    if packet.packet_type == PacketType::ConnectAck {
                        info!("Connected to {}", self.server_addr);
                        return Ok(());
                    }
                }
                _ => continue,
            }
        }

        Err(ProtocolError::Timeout)
    }

    /// Send a request and wait for response
    pub async fn request(&self, route: impl Into<String>, payload: Bytes) -> Result<Bytes> {
        let route = route.into();
        debug!("Sending request to route: {}", route);

        let sequence = self
            .transport
            .send_reliable(route.clone(), payload, self.server_addr)
            .await?;

        // Create a channel for the response
        let (tx, rx) = oneshot::channel();
        self.pending_requests
            .write()
            .await
            .insert(sequence, PendingRequest { tx });

        // Wait for response with timeout
        match timeout(self.request_timeout, rx).await {
            Ok(Ok(response)) => {
                debug!("Received response for sequence {}", sequence);
                Ok(response)
            }
            Ok(Err(_)) => Err(ProtocolError::Channel("Response channel closed".to_string())),
            Err(_) => {
                self.pending_requests.write().await.remove(&sequence);
                Err(ProtocolError::Timeout)
            }
        }
    }

    /// Send a request without waiting for response
    pub async fn send(&self, route: impl Into<String>, payload: Bytes) -> Result<u32> {
        let route = route.into();
        debug!("Sending fire-and-forget to route: {}", route);
        
        self.transport
            .send_reliable(route, payload, self.server_addr)
            .await
    }

    /// Start receiving responses
    pub async fn start_recv_loop(self: Arc<Self>) -> Result<()> {
        // Start retransmission task
        self.transport.clone().start_retransmission_task().await;

        // Start heartbeat task
        self.transport.clone().start_heartbeat_task(self.server_addr).await;

        loop {
            match self.transport.recv().await {
                Ok((packet, _)) => {
                    let client = self.clone();
                    tokio::spawn(async move {
                        if let Err(e) = client.handle_packet(packet).await {
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
    async fn handle_packet(&self, packet: Packet) -> Result<()> {
        match packet.packet_type {
            PacketType::Data => {
                debug!("Received data response: seq={}", packet.sequence);
                
                // Find pending request
                if let Some(pending) = self.pending_requests.write().await.remove(&packet.sequence) {
                    let _ = pending.tx.send(packet.payload);
                }
            }
            PacketType::Ack => {
                self.transport.handle_ack(packet.sequence).await;
            }
            PacketType::Nack => {
                self.transport.handle_nack(packet.sequence).await;
            }
            PacketType::Heartbeat => {
                debug!("Received heartbeat");
            }
            _ => {
                debug!("Unhandled packet type: {:?}", packet.packet_type);
            }
        }

        Ok(())
    }

    /// Set request timeout
    pub fn set_timeout(&mut self, timeout: Duration) {
        self.request_timeout = timeout;
    }

    /// Get client local address
    pub fn local_addr(&self) -> Result<SocketAddr> {
        self.transport.local_addr()
    }
}


//! UDP transport layer with reliability

use bytes::Bytes;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::net::UdpSocket;
use tokio::sync::{mpsc, RwLock, Mutex};
use tokio::time;
use tracing::{debug, warn, error};

use crate::crypto::CryptoProvider;
use crate::compression::CompressionProvider;
use crate::packet::{Packet, PacketType};
use crate::error::*;
use crate::{DEFAULT_ACK_TIMEOUT_MS, MAX_RETRANSMIT_ATTEMPTS};

/// Pending packet waiting for acknowledgment
struct PendingPacket {
    packet: Packet,
    dest: SocketAddr,
    sent_at: Instant,
    attempts: u8,
}

/// Transport configuration
#[derive(Clone)]
pub struct TransportConfig {
    pub ack_timeout: Duration,
    pub max_retransmit: u8,
    pub heartbeat_interval: Duration,
    pub enable_encryption: bool,
    pub enable_compression: bool,
}

impl Default for TransportConfig {
    fn default() -> Self {
        Self {
            ack_timeout: Duration::from_millis(DEFAULT_ACK_TIMEOUT_MS),
            max_retransmit: MAX_RETRANSMIT_ATTEMPTS,
            heartbeat_interval: Duration::from_secs(30),
            enable_encryption: false,
            enable_compression: false,
        }
    }
}

/// UDP transport with reliability
pub struct Transport {
    socket: Arc<UdpSocket>,
    config: TransportConfig,
    sequence: Arc<Mutex<u32>>,
    pending_acks: Arc<RwLock<HashMap<u32, PendingPacket>>>,
    crypto: Option<Arc<CryptoProvider>>,
    compression: Option<Arc<CompressionProvider>>,
}

impl Transport {
    /// Create a new transport bound to the given address
    pub async fn bind(addr: impl Into<SocketAddr>, config: TransportConfig) -> Result<Self> {
        let socket = UdpSocket::bind(addr.into()).await?;
        
        Ok(Self {
            socket: Arc::new(socket),
            config,
            sequence: Arc::new(Mutex::new(0)),
            pending_acks: Arc::new(RwLock::new(HashMap::new())),
            crypto: None,
            compression: None,
        })
    }

    /// Set encryption provider
    pub fn set_crypto(&mut self, crypto: CryptoProvider) {
        self.crypto = Some(Arc::new(crypto));
    }

    /// Set compression provider
    pub fn set_compression(&mut self, compression: CompressionProvider) {
        self.compression = Some(Arc::new(compression));
    }

    /// Get next sequence number
    async fn next_sequence(&self) -> u32 {
        let mut seq = self.sequence.lock().await;
        let current = *seq;
        *seq = seq.wrapping_add(1);
        current
    }

    /// Send a packet with reliability
    pub async fn send_reliable(
        &self,
        route: String,
        payload: Bytes,
        dest: SocketAddr,
    ) -> Result<u32> {
        let sequence = self.next_sequence().await;
        let mut packet = Packet::new_data(route, payload, sequence);

        // Apply compression if enabled
        if self.config.enable_compression {
            if let Some(comp) = &self.compression {
                packet.payload = comp.compress(&packet.payload)?;
                packet.flags.compressed = true;
            }
        }

        // Apply encryption if enabled
        if self.config.enable_encryption {
            if let Some(crypto) = &self.crypto {
                packet.payload = crypto.encrypt(&packet.payload)?;
                packet.flags.encrypted = true;
            }
        }

        // Serialize and send
        let data = packet.serialize()?;
        self.socket.send_to(&data, dest).await?;

        // Store for retransmission
        let pending = PendingPacket {
            packet,
            dest,
            sent_at: Instant::now(),
            attempts: 0,
        };
        self.pending_acks.write().await.insert(sequence, pending);

        debug!("Sent packet with sequence {}", sequence);
        Ok(sequence)
    }

    /// Send a packet without reliability
    pub async fn send(&self, packet: Packet, dest: SocketAddr) -> Result<()> {
        let data = packet.serialize()?;
        self.socket.send_to(&data, dest).await?;
        Ok(())
    }

    /// Receive a packet
    pub async fn recv(&self) -> Result<(Packet, SocketAddr)> {
        let mut buf = vec![0u8; 65536];
        let (len, addr) = self.socket.recv_from(&mut buf).await?;
        buf.truncate(len);

        let mut packet = Packet::deserialize(Bytes::from(buf))?;

        // Decrypt if needed
        if packet.flags.encrypted {
            if let Some(crypto) = &self.crypto {
                packet.payload = crypto.decrypt(&packet.payload)?;
            } else {
                return Err(ProtocolError::Encryption(
                    "Received encrypted packet but no crypto provider".to_string(),
                ));
            }
        }

        // Decompress if needed
        if packet.flags.compressed {
            if let Some(comp) = &self.compression {
                packet.payload = comp.decompress(&packet.payload)?;
            } else {
                return Err(ProtocolError::Compression(
                    "Received compressed packet but no compression provider".to_string(),
                ));
            }
        }

        // Send ACK if required
        if packet.flags.requires_ack && packet.packet_type == PacketType::Data {
            let ack = Packet::new_ack(packet.sequence);
            let _ = self.send(ack, addr).await;
        }

        Ok((packet, addr))
    }

    /// Handle acknowledgment
    pub async fn handle_ack(&self, sequence: u32) {
        self.pending_acks.write().await.remove(&sequence);
        debug!("Received ACK for sequence {}", sequence);
    }

    /// Handle negative acknowledgment
    pub async fn handle_nack(&self, sequence: u32) {
        if let Some(pending) = self.pending_acks.write().await.get_mut(&sequence) {
            pending.attempts += 1;
            pending.sent_at = Instant::now();
            debug!("Received NACK for sequence {}, retransmitting", sequence);
        }
    }

    /// Start retransmission task
    pub async fn start_retransmission_task(self: Arc<Self>) {
        let transport = self.clone();
        tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_millis(100));
            loop {
                interval.tick().await;

                let now = Instant::now();
                let mut to_retransmit = Vec::new();
                let mut to_remove = Vec::new();

                {
                    let mut pending = transport.pending_acks.write().await;
                    for (seq, packet) in pending.iter_mut() {
                        if now.duration_since(packet.sent_at) > transport.config.ack_timeout {
                            if packet.attempts >= transport.config.max_retransmit {
                                warn!("Max retransmit attempts reached for sequence {}", seq);
                                to_remove.push(*seq);
                            } else {
                                packet.attempts += 1;
                                packet.sent_at = now;
                                to_retransmit.push((packet.packet.clone(), packet.dest));
                            }
                        }
                    }

                    for seq in to_remove {
                        pending.remove(&seq);
                    }
                }

                for (packet, dest) in to_retransmit {
                    if let Err(e) = transport.send(packet, dest).await {
                        error!("Retransmission failed: {}", e);
                    }
                }
            }
        });
    }

    /// Start heartbeat task
    pub async fn start_heartbeat_task(self: Arc<Self>, dest: SocketAddr) {
        let transport = self.clone();
        tokio::spawn(async move {
            let mut interval = time::interval(transport.config.heartbeat_interval);
            loop {
                interval.tick().await;
                let heartbeat = Packet::new_heartbeat();
                if let Err(e) = transport.send(heartbeat, dest).await {
                    error!("Heartbeat send failed: {}", e);
                }
            }
        });
    }

    /// Get local address
    pub fn local_addr(&self) -> Result<SocketAddr> {
        self.socket.local_addr().map_err(Into::into)
    }
}


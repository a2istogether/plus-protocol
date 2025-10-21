//! Fast Protocol - High-speed, cross-platform custom network protocol
//!
//! This library provides a reliable, encrypted, and compressed UDP-based
//! network protocol with cross-platform support.

pub mod protocol;
pub mod transport;
pub mod server;
pub mod client;
pub mod crypto;
pub mod compression;
pub mod packet;
pub mod error;
pub mod middleware;

#[cfg(feature = "nodejs")]
pub mod node_bridge;

#[cfg(feature = "wasm")]
pub mod wasm_bridge;

pub use error::{ProtocolError, Result};
pub use server::Server;
pub use client::Client;
pub use packet::{Packet, PacketType};
pub use middleware::{Middleware, Handler, HandlerFn};

/// Protocol version
pub const PROTOCOL_VERSION: u8 = 1;

/// Maximum packet size (64KB)
pub const MAX_PACKET_SIZE: usize = 65507;

/// Default timeout for acknowledgments (milliseconds)
pub const DEFAULT_ACK_TIMEOUT_MS: u64 = 1000;

/// Maximum retransmission attempts
pub const MAX_RETRANSMIT_ATTEMPTS: u8 = 3;


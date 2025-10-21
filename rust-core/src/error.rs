//! Error types for the protocol

use std::io;
use thiserror::Error;

/// Result type alias for protocol operations
pub type Result<T> = std::result::Result<T, ProtocolError>;

/// Protocol error types
#[derive(Error, Debug)]
pub enum ProtocolError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] bincode::Error),

    #[error("Encryption error: {0}")]
    Encryption(String),

    #[error("Compression error: {0}")]
    Compression(String),

    #[error("Timeout error: operation timed out")]
    Timeout,

    #[error("Invalid packet: {0}")]
    InvalidPacket(String),

    #[error("Connection closed")]
    ConnectionClosed,

    #[error("Route not found: {0}")]
    RouteNotFound(String),

    #[error("Protocol version mismatch: expected {expected}, got {actual}")]
    VersionMismatch { expected: u8, actual: u8 },

    #[error("Maximum retransmission attempts reached")]
    MaxRetransmitReached,

    #[error("Invalid address: {0}")]
    InvalidAddress(String),

    #[error("Channel error: {0}")]
    Channel(String),

    #[error("Other error: {0}")]
    Other(String),
}


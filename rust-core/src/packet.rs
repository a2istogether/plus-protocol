//! Packet definitions and serialization

use bytes::{Bytes, BytesMut, Buf, BufMut};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::{error::*, PROTOCOL_VERSION};

/// Packet types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PacketType {
    /// Data packet
    Data = 0,
    /// Acknowledgment
    Ack = 1,
    /// Negative acknowledgment
    Nack = 2,
    /// Heartbeat/keep-alive
    Heartbeat = 3,
    /// Connection request
    Connect = 4,
    /// Connection response
    ConnectAck = 5,
    /// Disconnection
    Disconnect = 6,
    /// Batch of packets
    Batch = 7,
}

impl TryFrom<u8> for PacketType {
    type Error = ProtocolError;

    fn try_from(value: u8) -> Result<Self> {
        match value {
            0 => Ok(PacketType::Data),
            1 => Ok(PacketType::Ack),
            2 => Ok(PacketType::Nack),
            3 => Ok(PacketType::Heartbeat),
            4 => Ok(PacketType::Connect),
            5 => Ok(PacketType::ConnectAck),
            6 => Ok(PacketType::Disconnect),
            7 => Ok(PacketType::Batch),
            _ => Err(ProtocolError::InvalidPacket(format!(
                "Unknown packet type: {}",
                value
            ))),
        }
    }
}

/// Packet flags
#[derive(Debug, Clone, Copy, Default)]
pub struct PacketFlags {
    pub encrypted: bool,
    pub compressed: bool,
    pub requires_ack: bool,
}

impl PacketFlags {
    pub fn to_byte(&self) -> u8 {
        let mut byte = 0u8;
        if self.encrypted {
            byte |= 0b0000_0001;
        }
        if self.compressed {
            byte |= 0b0000_0010;
        }
        if self.requires_ack {
            byte |= 0b0000_0100;
        }
        byte
    }

    pub fn from_byte(byte: u8) -> Self {
        Self {
            encrypted: (byte & 0b0000_0001) != 0,
            compressed: (byte & 0b0000_0010) != 0,
            requires_ack: (byte & 0b0000_0100) != 0,
        }
    }
}

/// Main packet structure
#[derive(Debug, Clone)]
pub struct Packet {
    pub version: u8,
    pub packet_type: PacketType,
    pub flags: PacketFlags,
    pub sequence: u32,
    pub timestamp: u64,
    pub route: String,
    pub payload: Bytes,
}

impl Packet {
    /// Create a new data packet
    pub fn new_data(route: String, payload: Bytes, sequence: u32) -> Self {
        Self {
            version: PROTOCOL_VERSION,
            packet_type: PacketType::Data,
            flags: PacketFlags {
                requires_ack: true,
                ..Default::default()
            },
            sequence,
            timestamp: Self::current_timestamp(),
            route,
            payload,
        }
    }

    /// Create an acknowledgment packet
    pub fn new_ack(sequence: u32) -> Self {
        Self {
            version: PROTOCOL_VERSION,
            packet_type: PacketType::Ack,
            flags: PacketFlags::default(),
            sequence,
            timestamp: Self::current_timestamp(),
            route: String::new(),
            payload: Bytes::new(),
        }
    }

    /// Create a negative acknowledgment packet
    pub fn new_nack(sequence: u32) -> Self {
        Self {
            version: PROTOCOL_VERSION,
            packet_type: PacketType::Nack,
            flags: PacketFlags::default(),
            sequence,
            timestamp: Self::current_timestamp(),
            route: String::new(),
            payload: Bytes::new(),
        }
    }

    /// Create a heartbeat packet
    pub fn new_heartbeat() -> Self {
        Self {
            version: PROTOCOL_VERSION,
            packet_type: PacketType::Heartbeat,
            flags: PacketFlags::default(),
            sequence: 0,
            timestamp: Self::current_timestamp(),
            route: String::new(),
            payload: Bytes::new(),
        }
    }

    /// Create a connection request packet
    pub fn new_connect() -> Self {
        Self {
            version: PROTOCOL_VERSION,
            packet_type: PacketType::Connect,
            flags: PacketFlags::default(),
            sequence: 0,
            timestamp: Self::current_timestamp(),
            route: String::new(),
            payload: Bytes::new(),
        }
    }

    /// Get current timestamp in milliseconds
    fn current_timestamp() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
    }

    /// Serialize packet to bytes
    pub fn serialize(&self) -> Result<Bytes> {
        let route_bytes = self.route.as_bytes();
        let route_len = route_bytes.len() as u16;
        let payload_len = self.payload.len() as u32;

        // Calculate total size
        let total_size = 1 + // version
            1 + // packet_type
            1 + // flags
            4 + // sequence
            8 + // timestamp
            2 + // route_len
            route_len as usize +
            4 + // payload_len
            payload_len as usize;

        let mut buf = BytesMut::with_capacity(total_size);

        // Write header
        buf.put_u8(self.version);
        buf.put_u8(self.packet_type as u8);
        buf.put_u8(self.flags.to_byte());
        buf.put_u32(self.sequence);
        buf.put_u64(self.timestamp);

        // Write route
        buf.put_u16(route_len);
        buf.put_slice(route_bytes);

        // Write payload
        buf.put_u32(payload_len);
        buf.put_slice(&self.payload);

        Ok(buf.freeze())
    }

    /// Deserialize packet from bytes
    pub fn deserialize(mut data: Bytes) -> Result<Self> {
        if data.remaining() < 20 {
            return Err(ProtocolError::InvalidPacket(
                "Packet too small".to_string(),
            ));
        }

        // Read header
        let version = data.get_u8();
        if version != PROTOCOL_VERSION {
            return Err(ProtocolError::VersionMismatch {
                expected: PROTOCOL_VERSION,
                actual: version,
            });
        }

        let packet_type = PacketType::try_from(data.get_u8())?;
        let flags = PacketFlags::from_byte(data.get_u8());
        let sequence = data.get_u32();
        let timestamp = data.get_u64();

        // Read route
        let route_len = data.get_u16() as usize;
        if data.remaining() < route_len {
            return Err(ProtocolError::InvalidPacket(
                "Invalid route length".to_string(),
            ));
        }
        let route_bytes = data.copy_to_bytes(route_len);
        let route = String::from_utf8(route_bytes.to_vec())
            .map_err(|e| ProtocolError::InvalidPacket(format!("Invalid route UTF-8: {}", e)))?;

        // Read payload
        if data.remaining() < 4 {
            return Err(ProtocolError::InvalidPacket(
                "Invalid payload length".to_string(),
            ));
        }
        let payload_len = data.get_u32() as usize;
        if data.remaining() < payload_len {
            return Err(ProtocolError::InvalidPacket(
                "Invalid payload data".to_string(),
            ));
        }
        let payload = data.copy_to_bytes(payload_len);

        Ok(Self {
            version,
            packet_type,
            flags,
            sequence,
            timestamp,
            route,
            payload,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_packet_serialization() {
        let packet = Packet::new_data(
            "/test".to_string(),
            Bytes::from("hello world"),
            42,
        );

        let serialized = packet.serialize().unwrap();
        let deserialized = Packet::deserialize(serialized).unwrap();

        assert_eq!(packet.version, deserialized.version);
        assert_eq!(packet.packet_type, deserialized.packet_type);
        assert_eq!(packet.sequence, deserialized.sequence);
        assert_eq!(packet.route, deserialized.route);
        assert_eq!(packet.payload, deserialized.payload);
    }
}


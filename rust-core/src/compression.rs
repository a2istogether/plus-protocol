//! Compression and decompression support

use bytes::Bytes;
use std::io::{Read, Write};

use crate::error::*;

/// Compression algorithm
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CompressionAlgorithm {
    Zstd,
    Lz4,
}

/// Compression provider
pub struct CompressionProvider {
    algorithm: CompressionAlgorithm,
    level: i32,
}

impl CompressionProvider {
    /// Create a new compression provider with Zstd
    pub fn new_zstd(level: i32) -> Self {
        Self {
            algorithm: CompressionAlgorithm::Zstd,
            level,
        }
    }

    /// Create a new compression provider with LZ4
    pub fn new_lz4(level: i32) -> Self {
        Self {
            algorithm: CompressionAlgorithm::Lz4,
            level,
        }
    }

    /// Compress data
    pub fn compress(&self, data: &[u8]) -> Result<Bytes> {
        match self.algorithm {
            CompressionAlgorithm::Zstd => {
                let compressed = zstd::encode_all(data, self.level)
                    .map_err(|e| ProtocolError::Compression(format!("Zstd compression failed: {}", e)))?;
                Ok(Bytes::from(compressed))
            }
            CompressionAlgorithm::Lz4 => {
                let mut encoder = lz4::EncoderBuilder::new()
                    .level(self.level as u32)
                    .build(Vec::new())
                    .map_err(|e| ProtocolError::Compression(format!("LZ4 encoder creation failed: {}", e)))?;
                
                encoder
                    .write_all(data)
                    .map_err(|e| ProtocolError::Compression(format!("LZ4 compression failed: {}", e)))?;
                
                let (compressed, result) = encoder.finish();
                result
                    .map_err(|e| ProtocolError::Compression(format!("LZ4 finish failed: {}", e)))?;
                
                Ok(Bytes::from(compressed))
            }
        }
    }

    /// Decompress data
    pub fn decompress(&self, data: &[u8]) -> Result<Bytes> {
        match self.algorithm {
            CompressionAlgorithm::Zstd => {
                let decompressed = zstd::decode_all(data)
                    .map_err(|e| ProtocolError::Compression(format!("Zstd decompression failed: {}", e)))?;
                Ok(Bytes::from(decompressed))
            }
            CompressionAlgorithm::Lz4 => {
                let mut decoder = lz4::Decoder::new(data)
                    .map_err(|e| ProtocolError::Compression(format!("LZ4 decoder creation failed: {}", e)))?;
                
                let mut decompressed = Vec::new();
                decoder
                    .read_to_end(&mut decompressed)
                    .map_err(|e| ProtocolError::Compression(format!("LZ4 decompression failed: {}", e)))?;
                
                Ok(Bytes::from(decompressed))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zstd_compression() {
        let compressor = CompressionProvider::new_zstd(3);
        let data = b"Hello, World! This is a test message for compression.";
        
        let compressed = compressor.compress(data).unwrap();
        let decompressed = compressor.decompress(&compressed).unwrap();
        
        assert_eq!(data, &decompressed[..]);
    }

    #[test]
    fn test_lz4_compression() {
        let compressor = CompressionProvider::new_lz4(4);
        let data = b"Hello, World! This is a test message for compression.";
        
        let compressed = compressor.compress(data).unwrap();
        let decompressed = compressor.decompress(&compressed).unwrap();
        
        assert_eq!(data, &decompressed[..]);
    }
}


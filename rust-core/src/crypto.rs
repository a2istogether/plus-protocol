//! Encryption and decryption support

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use chacha20poly1305::{ChaCha20Poly1305, Key};
use bytes::Bytes;
use rand::Rng;

use crate::error::*;

/// Encryption algorithm
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EncryptionAlgorithm {
    Aes256Gcm,
    ChaCha20Poly1305,
}

/// Crypto provider for encryption and decryption
pub struct CryptoProvider {
    algorithm: EncryptionAlgorithm,
    aes_cipher: Option<Aes256Gcm>,
    chacha_cipher: Option<ChaCha20Poly1305>,
}

impl CryptoProvider {
    /// Create a new crypto provider with AES-256-GCM
    pub fn new_aes(key: &[u8; 32]) -> Self {
        let cipher = Aes256Gcm::new(key.into());
        Self {
            algorithm: EncryptionAlgorithm::Aes256Gcm,
            aes_cipher: Some(cipher),
            chacha_cipher: None,
        }
    }

    /// Create a new crypto provider with ChaCha20-Poly1305
    pub fn new_chacha(key: &[u8; 32]) -> Self {
        let cipher = ChaCha20Poly1305::new(Key::from_slice(key));
        Self {
            algorithm: EncryptionAlgorithm::ChaCha20Poly1305,
            aes_cipher: None,
            chacha_cipher: Some(cipher),
        }
    }

    /// Generate a random 256-bit key
    pub fn generate_key() -> [u8; 32] {
        let mut key = [0u8; 32];
        rand::thread_rng().fill(&mut key);
        key
    }

    /// Encrypt data
    pub fn encrypt(&self, data: &[u8]) -> Result<Bytes> {
        // Generate random nonce (96 bits = 12 bytes)
        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = match self.algorithm {
            EncryptionAlgorithm::Aes256Gcm => {
                let cipher = self.aes_cipher.as_ref()
                    .ok_or_else(|| ProtocolError::Encryption("AES cipher not initialized".to_string()))?;
                cipher
                    .encrypt(nonce, data)
                    .map_err(|e| ProtocolError::Encryption(format!("AES encryption failed: {}", e)))?
            }
            EncryptionAlgorithm::ChaCha20Poly1305 => {
                let cipher = self.chacha_cipher.as_ref()
                    .ok_or_else(|| ProtocolError::Encryption("ChaCha cipher not initialized".to_string()))?;
                cipher
                    .encrypt(nonce, data)
                    .map_err(|e| ProtocolError::Encryption(format!("ChaCha encryption failed: {}", e)))?
            }
        };

        // Prepend nonce to ciphertext
        let mut result = Vec::with_capacity(12 + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);

        Ok(Bytes::from(result))
    }

    /// Decrypt data
    pub fn decrypt(&self, data: &[u8]) -> Result<Bytes> {
        if data.len() < 12 {
            return Err(ProtocolError::Encryption("Data too short".to_string()));
        }

        // Extract nonce and ciphertext
        let nonce = Nonce::from_slice(&data[0..12]);
        let ciphertext = &data[12..];

        let plaintext = match self.algorithm {
            EncryptionAlgorithm::Aes256Gcm => {
                let cipher = self.aes_cipher.as_ref()
                    .ok_or_else(|| ProtocolError::Encryption("AES cipher not initialized".to_string()))?;
                cipher
                    .decrypt(nonce, ciphertext)
                    .map_err(|e| ProtocolError::Encryption(format!("AES decryption failed: {}", e)))?
            }
            EncryptionAlgorithm::ChaCha20Poly1305 => {
                let cipher = self.chacha_cipher.as_ref()
                    .ok_or_else(|| ProtocolError::Encryption("ChaCha cipher not initialized".to_string()))?;
                cipher
                    .decrypt(nonce, ciphertext)
                    .map_err(|e| ProtocolError::Encryption(format!("ChaCha decryption failed: {}", e)))?
            }
        };

        Ok(Bytes::from(plaintext))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_aes_encryption() {
        let key = CryptoProvider::generate_key();
        let crypto = CryptoProvider::new_aes(&key);

        let plaintext = b"Hello, World!";
        let ciphertext = crypto.encrypt(plaintext).unwrap();
        let decrypted = crypto.decrypt(&ciphertext).unwrap();

        assert_eq!(plaintext, &decrypted[..]);
    }

    #[test]
    fn test_chacha_encryption() {
        let key = CryptoProvider::generate_key();
        let crypto = CryptoProvider::new_chacha(&key);

        let plaintext = b"Hello, World!";
        let ciphertext = crypto.encrypt(plaintext).unwrap();
        let decrypted = crypto.decrypt(&ciphertext).unwrap();

        assert_eq!(plaintext, &decrypted[..]);
    }
}


//! Protocol utilities and helpers

use bytes::Bytes;
use serde::{Deserialize, Serialize};

/// Standard request format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Request<T> {
    pub id: String,
    pub data: T,
}

/// Standard response format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response<T> {
    pub id: String,
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> Response<T> {
    pub fn success(id: String, data: T) -> Self {
        Self {
            id,
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(id: String, error: String) -> Self {
        Self {
            id,
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

/// Helper to serialize JSON
pub fn to_json<T: Serialize>(value: &T) -> Result<Bytes, serde_json::Error> {
    serde_json::to_vec(value).map(Bytes::from)
}

/// Helper to deserialize JSON
pub fn from_json<T: for<'de> Deserialize<'de>>(data: &[u8]) -> Result<T, serde_json::Error> {
    serde_json::from_slice(data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_serialization() {
        let req = Request {
            id: "test-123".to_string(),
            data: "hello".to_string(),
        };

        let json = to_json(&req).unwrap();
        let parsed: Request<String> = from_json(&json).unwrap();

        assert_eq!(req.id, parsed.id);
        assert_eq!(req.data, parsed.data);
    }

    #[test]
    fn test_response_serialization() {
        let resp = Response::success("test-123".to_string(), 42);

        let json = to_json(&resp).unwrap();
        let parsed: Response<i32> = from_json(&json).unwrap();

        assert_eq!(resp.id, parsed.id);
        assert_eq!(resp.success, parsed.success);
        assert_eq!(resp.data, parsed.data);
    }
}


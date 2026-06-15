//! The agent→backend wire contract. This module is the canonical spec for the
//! Phase 3 ingest endpoint: the JSON shape below and the HMAC scheme must match
//! on both sides.
//!
//! Signing: `HMAC-SHA256(hmac_secret, compact_json_body)`, lowercase hex, sent
//! in the `X-Proctor-Signature` header. The backend recomputes it over the raw
//! received body and constant-time compares. This is defense-in-depth on top of
//! TLS + the bearer token: it stops a leaked token from forging believable
//! reports without also holding the per-session secret.

use hmac::{Hmac, Mac};
use proctor_detect::ScanResult;
use serde::{Deserialize, Serialize};
use sha2::Sha256;

pub const AGENT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Report {
    pub session_id: String,
    /// Monotonic per-agent sequence number. Lets the backend detect gaps
    /// (dropped reports) and ignore replays/out-of-order deliveries.
    pub seq: u64,
    pub sent_at_ms: u64,
    pub agent_version: String,
    pub scan: ScanResult,
}

impl Report {
    pub fn new(session_id: impl Into<String>, seq: u64, sent_at_ms: u64, scan: ScanResult) -> Self {
        Self {
            session_id: session_id.into(),
            seq,
            sent_at_ms,
            agent_version: AGENT_VERSION.to_string(),
            scan,
        }
    }

    /// Serialize to the exact compact bytes that get both signed and sent.
    /// Callers MUST sign and transmit the same bytes (don't re-serialize).
    pub fn to_body(&self) -> Result<Vec<u8>, String> {
        serde_json::to_vec(self).map_err(|e| format!("serialize report: {e}"))
    }
}

/// Compute the lowercase-hex HMAC-SHA256 signature of `body` under `secret`.
pub fn sign(secret: &str, body: &[u8]) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes())
        .expect("HMAC accepts keys of any length");
    mac.update(body);
    hex::encode(mac.finalize().into_bytes())
}

/// Response the backend may return to the agent after ingesting a report.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct IngestAck {
    /// When true, the session is over (interviewer ended it / time expired) and
    /// the agent should stop and self-uninstall.
    #[serde(default)]
    pub session_ended: bool,
}

#[cfg(test)]
mod tests {
    use super::*;
    use proctor_detect::evaluate;

    #[test]
    fn signature_is_stable_and_key_sensitive() {
        let body = b"{\"hello\":\"world\"}";
        let a = sign("secret-1", body);
        let b = sign("secret-1", body);
        let c = sign("secret-2", body);
        assert_eq!(a, b, "same key+body must give same signature");
        assert_ne!(a, c, "different key must change signature");
        assert_eq!(a.len(), 64, "sha256 hex is 64 chars");
    }

    #[test]
    fn signature_covers_body_tampering() {
        let sig = sign("k", b"amount=10");
        let forged = sign("k", b"amount=99");
        assert_ne!(sig, forged);
    }

    #[test]
    fn report_roundtrips_and_signs_its_own_bytes() {
        let scan = evaluate(&[]);
        let report = Report::new("sess_123", 1, 1_700_000_000_000, scan);
        let body = report.to_body().unwrap();

        // The bytes we sign are the bytes we'd send.
        let _sig = sign("secret", &body);
        let parsed: Report = serde_json::from_slice(&body).unwrap();
        assert_eq!(parsed.session_id, "sess_123");
        assert_eq!(parsed.seq, 1);
        assert_eq!(parsed.agent_version, AGENT_VERSION);
    }

    #[test]
    fn ack_defaults_to_not_ended() {
        let ack: IngestAck = serde_json::from_str("{}").unwrap();
        assert!(!ack.session_ended);
        let ended: IngestAck = serde_json::from_str(r#"{"session_ended":true}"#).unwrap();
        assert!(ended.session_ended);
    }
}

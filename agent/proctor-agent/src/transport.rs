//! Real HTTP transport over `ureq` (blocking, no async runtime needed for a
//! once-every-few-seconds POST).

use crate::report::IngestAck;
use crate::runtime::{SendOutcome, Transport};

pub struct HttpTransport;

impl Transport for HttpTransport {
    fn send(
        &self,
        url: &str,
        token: &str,
        session_id: &str,
        signature: &str,
        body: &[u8],
    ) -> SendOutcome {
        let resp = ureq::post(url)
            .set("Authorization", &format!("Bearer {token}"))
            .set("Content-Type", "application/json")
            .set("X-Proctor-Session", session_id)
            .set("X-Proctor-Signature", signature)
            .send_bytes(body);

        match resp {
            Ok(r) => match r.into_json::<IngestAck>() {
                Ok(ack) => SendOutcome::Ack(ack),
                // 2xx but unparseable body — treat as a benign ack, keep going.
                Err(e) => SendOutcome::Transient(format!("bad ack body: {e}")),
            },
            // Non-2xx with a response.
            Err(ureq::Error::Status(code, _)) => match code {
                401 | 403 | 410 => SendOutcome::Revoked,
                _ => SendOutcome::Transient(format!("server status {code}")),
            },
            // Transport-level failure (DNS, TLS, connection).
            Err(ureq::Error::Transport(t)) => SendOutcome::Transient(t.to_string()),
        }
    }
}

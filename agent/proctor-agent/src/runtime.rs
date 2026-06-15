//! The agent control loop: scan → build → sign → send → interpret, on an
//! interval, until the session ends or the token is revoked.
//!
//! HTTP lives behind the [`Transport`] trait so the loop's decision logic
//! (sequencing, when to stop, when to self-uninstall) is unit-tested with a
//! mock, no server required.

use crate::config::AgentConfig;
use crate::report::{sign, IngestAck, Report};
use proctor_detect::ScanResult;

/// Outcome the backend round-trip can produce.
pub enum SendOutcome {
    Ack(IngestAck),
    /// Token rejected / session gone (HTTP 401/403/410): stop and uninstall.
    Revoked,
    /// Transient failure (network, 5xx): keep going, the next tick retries.
    Transient(String),
}

pub trait Transport {
    /// POST a signed report. `signature` is the hex HMAC of `body`.
    fn send(&self, url: &str, token: &str, session_id: &str, signature: &str, body: &[u8])
        -> SendOutcome;
}

/// What the loop should do after a tick.
#[derive(Debug, PartialEq, Eq)]
pub enum Tick {
    Continue,
    Stop { uninstall: bool },
}

pub struct Runtime<T: Transport> {
    cfg: AgentConfig,
    transport: T,
    seq: u64,
    now_ms: Box<dyn Fn() -> u64 + Send>,
    scan: Box<dyn Fn() -> Result<ScanResult, String> + Send>,
}

impl<T: Transport> Runtime<T> {
    pub fn new(
        cfg: AgentConfig,
        transport: T,
        now_ms: Box<dyn Fn() -> u64 + Send>,
        scan: Box<dyn Fn() -> Result<ScanResult, String> + Send>,
    ) -> Self {
        Self { cfg, transport, seq: 0, now_ms, scan }
    }

    /// One scan+report cycle. Pure-ish: only touches the injected scan/clock and
    /// the transport, so it's fully testable.
    pub fn tick(&mut self) -> Tick {
        // Hard gate: never transmit anything without consent.
        if !self.cfg.consent_granted {
            return Tick::Stop { uninstall: false };
        }

        let scan = match (self.scan)() {
            Ok(s) => s,
            // A failed local scan is not a reason to tear down the session;
            // skip this tick and try again next interval.
            Err(_) => return Tick::Continue,
        };

        self.seq += 1;
        let report = Report::new(&self.cfg.session_id, self.seq, (self.now_ms)(), scan);
        let body = match report.to_body() {
            Ok(b) => b,
            Err(_) => return Tick::Continue,
        };
        let signature = sign(&self.cfg.hmac_secret, &body);

        match self.transport.send(
            &self.cfg.events_url(),
            &self.cfg.token,
            &self.cfg.session_id,
            &signature,
            &body,
        ) {
            SendOutcome::Ack(ack) if ack.session_ended => Tick::Stop { uninstall: true },
            SendOutcome::Ack(_) => Tick::Continue,
            SendOutcome::Revoked => Tick::Stop { uninstall: true },
            SendOutcome::Transient(reason) => {
                eprintln!("proctor: transient send failure, will retry: {reason}");
                Tick::Continue
            }
        }
    }

    /// Run until a tick says stop. Returns whether to self-uninstall.
    pub fn run(&mut self) -> bool {
        loop {
            match self.tick() {
                Tick::Continue => std::thread::sleep(self.cfg.scan_interval),
                Tick::Stop { uninstall } => return uninstall,
            }
        }
    }

    /// Current sequence number (test/introspection accessor).
    #[allow(dead_code)]
    pub fn seq(&self) -> u64 {
        self.seq
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    use std::time::Duration;

    fn cfg(consent: bool) -> AgentConfig {
        AgentConfig {
            session_id: "sess".into(),
            backend_url: "https://x/api/proctor".into(),
            token: "tok".into(),
            hmac_secret: "secret".into(),
            scan_interval: Duration::from_millis(0),
            consent_granted: consent,
        }
    }

    /// Mock transport returning a scripted sequence of outcomes.
    struct ScriptTransport {
        script: RefCell<Vec<SendOutcome>>,
        sent_signatures: RefCell<Vec<String>>,
    }
    impl Transport for ScriptTransport {
        fn send(&self, _u: &str, _t: &str, _s: &str, signature: &str, _b: &[u8]) -> SendOutcome {
            self.sent_signatures.borrow_mut().push(signature.to_string());
            self.script.borrow_mut().remove(0)
        }
    }

    fn rt(consent: bool, script: Vec<SendOutcome>) -> Runtime<ScriptTransport> {
        Runtime::new(
            cfg(consent),
            ScriptTransport {
                script: RefCell::new(script),
                sent_signatures: RefCell::new(vec![]),
            },
            Box::new(|| 1_700_000_000_000),
            Box::new(|| Ok(proctor_detect::evaluate(&[]))),
        )
    }

    #[test]
    fn no_consent_means_no_transmission_and_stop() {
        let mut r = rt(false, vec![]);
        assert_eq!(r.tick(), Tick::Stop { uninstall: false });
        assert_eq!(r.seq(), 0, "must not even build a report without consent");
    }

    #[test]
    fn normal_ack_continues_and_increments_seq() {
        let mut r = rt(true, vec![SendOutcome::Ack(IngestAck::default())]);
        assert_eq!(r.tick(), Tick::Continue);
        assert_eq!(r.seq(), 1);
    }

    #[test]
    fn session_ended_stops_and_uninstalls() {
        let mut r = rt(true, vec![SendOutcome::Ack(IngestAck { session_ended: true })]);
        assert_eq!(r.tick(), Tick::Stop { uninstall: true });
    }

    #[test]
    fn revoked_token_stops_and_uninstalls() {
        let mut r = rt(true, vec![SendOutcome::Revoked]);
        assert_eq!(r.tick(), Tick::Stop { uninstall: true });
    }

    #[test]
    fn transient_error_keeps_going() {
        let mut r = rt(true, vec![SendOutcome::Transient("network".into())]);
        assert_eq!(r.tick(), Tick::Continue);
        assert_eq!(r.seq(), 1, "seq advances even on transient failure");
    }

    #[test]
    fn seq_is_monotonic_across_ticks() {
        let mut r = rt(
            true,
            vec![
                SendOutcome::Ack(IngestAck::default()),
                SendOutcome::Transient("x".into()),
                SendOutcome::Ack(IngestAck::default()),
            ],
        );
        r.tick();
        r.tick();
        r.tick();
        assert_eq!(r.seq(), 3);
    }
}

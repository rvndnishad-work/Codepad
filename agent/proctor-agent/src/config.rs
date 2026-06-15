//! Agent configuration. Loaded from one of two sources, in order:
//!   1. the OS environment (`PROCTOR_*`) — used by the recruiter's token link
//!      and by tests/CLI;
//!   2. a `proctor-config.json` file sitting next to the executable — the
//!      portable distribution model (candidate downloads the exe + config and
//!      double-clicks, Zoho-Assist style; no env wrangling).
//! Kept tiny and validated up front.

use serde::Deserialize;
use std::time::Duration;

/// On-disk `proctor-config.json` shape (the recruiter UI generates this).
#[derive(Deserialize)]
struct FileConfig {
    session_id: String,
    backend_url: String,
    token: String,
    hmac_secret: String,
    #[serde(default)]
    scan_interval_secs: Option<u64>,
}

#[derive(Debug, Clone)]
pub struct AgentConfig {
    pub session_id: String,
    /// Base URL of the proctor API, e.g.
    /// `https://app.example.com/api/interview/<id>/proctor`.
    pub backend_url: String,
    /// One-time bearer token identifying + authorizing this agent instance.
    pub token: String,
    /// Per-session secret used to HMAC-sign report bodies (defense in depth on
    /// top of TLS + bearer token).
    pub hmac_secret: String,
    pub scan_interval: Duration,
    /// True only after the candidate accepted the consent screen. The runtime
    /// refuses to send anything until this is set.
    pub consent_granted: bool,
}

/// Clamp a scan interval (seconds) into a sane range.
fn clamp_interval(secs: u64) -> Duration {
    Duration::from_secs(secs.clamp(2, 60))
}

impl AgentConfig {
    /// Resolve config: environment first, then `proctor-config.json` beside the
    /// executable. This is what the runtime should call.
    pub fn load() -> Result<Self, String> {
        match Self::from_env() {
            Ok(cfg) => Ok(cfg),
            Err(_) => Self::from_file(),
        }
    }

    /// Load `proctor-config.json` from the executable's own directory.
    pub fn from_file() -> Result<Self, String> {
        let exe = std::env::current_exe().map_err(|e| format!("current_exe: {e}"))?;
        let path = exe
            .parent()
            .ok_or("executable has no parent directory")?
            .join("proctor-config.json");
        let data = std::fs::read_to_string(&path)
            .map_err(|_| format!("no proctor-config.json beside the app ({})", path.display()))?;
        // Tolerate a UTF-8 BOM (some editors/tools prepend one); serde rejects it.
        let data = data.trim_start_matches('\u{feff}');
        let fc: FileConfig =
            serde_json::from_str(data).map_err(|e| format!("invalid proctor-config.json: {e}"))?;
        Ok(Self {
            session_id: fc.session_id,
            backend_url: fc.backend_url.trim_end_matches('/').to_string(),
            token: fc.token,
            hmac_secret: fc.hmac_secret,
            scan_interval: clamp_interval(fc.scan_interval_secs.unwrap_or(5)),
            consent_granted: false,
        })
    }

    /// Load from environment. Returns a human-readable error naming the first
    /// missing/invalid var.
    pub fn from_env() -> Result<Self, String> {
        let get = |k: &str| std::env::var(k).map_err(|_| format!("missing env var {k}"));

        let scan_interval_secs = std::env::var("PROCTOR_SCAN_INTERVAL_SECS")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(5);

        Ok(Self {
            session_id: get("PROCTOR_SESSION_ID")?,
            backend_url: get("PROCTOR_BACKEND_URL")?.trim_end_matches('/').to_string(),
            token: get("PROCTOR_TOKEN")?,
            hmac_secret: get("PROCTOR_HMAC_SECRET")?,
            scan_interval: clamp_interval(scan_interval_secs),
            // Consent is asserted by the GUI shell via this flag; default false.
            consent_granted: std::env::var("PROCTOR_CONSENT_GRANTED")
                .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
                .unwrap_or(false),
        })
    }

    pub fn events_url(&self) -> String {
        format!("{}/events", self.backend_url)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The exact JSON the recruiter UI (`ProctorSetup.tsx` `downloadConfig`)
    /// writes must deserialize into a usable config. Pins that cross-language
    /// contract.
    #[test]
    fn parses_recruiter_generated_config() {
        let json = r#"{
            "session_id": "cmqe_abc",
            "backend_url": "https://app.example.com/api/interview/cmqe_abc/proctor/",
            "token": "tok123",
            "hmac_secret": "sec456",
            "scan_interval_secs": 5
        }"#;
        let fc: FileConfig = serde_json::from_str(json).unwrap();
        assert_eq!(fc.session_id, "cmqe_abc");
        assert_eq!(fc.scan_interval_secs, Some(5));
        // backend_url trailing slash is trimmed when building events_url.
        let cfg = AgentConfig {
            session_id: fc.session_id,
            backend_url: fc.backend_url.trim_end_matches('/').to_string(),
            token: fc.token,
            hmac_secret: fc.hmac_secret,
            scan_interval: clamp_interval(fc.scan_interval_secs.unwrap()),
            consent_granted: false,
        };
        assert_eq!(
            cfg.events_url(),
            "https://app.example.com/api/interview/cmqe_abc/proctor/events"
        );
    }

    #[test]
    fn scan_interval_is_clamped() {
        assert_eq!(clamp_interval(0), Duration::from_secs(2));
        assert_eq!(clamp_interval(999), Duration::from_secs(60));
        assert_eq!(clamp_interval(5), Duration::from_secs(5));
    }

    #[test]
    fn scan_interval_defaults_when_absent() {
        let fc: FileConfig =
            serde_json::from_str(r#"{"session_id":"s","backend_url":"u","token":"t","hmac_secret":"h"}"#)
                .unwrap();
        assert_eq!(fc.scan_interval_secs, None);
    }
}

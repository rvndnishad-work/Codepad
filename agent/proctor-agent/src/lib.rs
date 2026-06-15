//! Reusable proctor-agent runtime: config, signed reporting, the scan→send
//! control loop, HTTP transport, and clean self-uninstall. The `proctor-agent`
//! binary is a thin CLI over these; the Tauri consent app (`proctor-app`)
//! drives the same modules behind a GUI.

pub mod config;
pub mod report;
pub mod runtime;
pub mod transport;
pub mod uninstall;

use std::time::{SystemTime, UNIX_EPOCH};

/// Unix epoch millis, saturating to 0 on the (impossible) pre-epoch case.
pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

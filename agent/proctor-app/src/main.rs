// Hide the console window in release builds (GUI app).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Consent-gated desktop shell around the proctor runtime.
//!
//! Flow: the candidate sees exactly what is monitored and clicks consent; only
//! then does scanning start. If launched with backend config in the environment
//! (the token link the recruiter sends), reports are signed and sent; launched
//! standalone, it runs a local-only detection demo so the build can be tried
//! without a backend. When the session ends (or is declined) the agent removes
//! itself.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use proctor_agent::config::AgentConfig;
use proctor_agent::report::{sign, Report};
use proctor_agent::runtime::{SendOutcome, Transport};
use proctor_agent::{now_ms, transport::HttpTransport, uninstall};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Default)]
struct AppState {
    stop: Mutex<Option<Arc<AtomicBool>>>,
}

#[derive(Serialize, Clone)]
struct SignalLite {
    severity: String,
    process_name: String,
    window_title: String,
    detail: String,
}

#[derive(Serialize, Clone)]
struct StatusPayload {
    suspicion: u32,
    scanned_windows: usize,
    seq: u64,
    /// Whether the last report reached the backend (false in local-demo mode).
    connected: bool,
    /// "live" when reporting to a backend, "demo" when local-only.
    mode: String,
    signals: Vec<SignalLite>,
}

#[derive(Serialize, Clone)]
struct EndedPayload {
    reason: String,
}

#[derive(Serialize, Clone)]
struct SessionInfo {
    /// Present when backend config was supplied via the environment.
    session_id: Option<String>,
    backend_configured: bool,
}

/// What the consent window shows before scanning. Read-only; never sent.
#[tauri::command]
fn session_info() -> SessionInfo {
    match AgentConfig::load() {
        Ok(cfg) => SessionInfo {
            session_id: Some(cfg.session_id),
            backend_configured: true,
        },
        Err(_) => SessionInfo {
            session_id: None,
            backend_configured: false,
        },
    }
}

/// The consent action: the user has agreed, so start scanning.
#[tauri::command]
fn start_proctoring(app: AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    // The GUI consent IS the grant — force it on whatever the config said.
    let cfg = AgentConfig::load().ok().map(|mut c| {
        c.consent_granted = true;
        c
    });
    let mode = if cfg.is_some() { "live" } else { "demo" };

    let stop = Arc::new(AtomicBool::new(false));
    *state.stop.lock().unwrap() = Some(stop.clone());

    let app2 = app.clone();
    thread::spawn(move || run_loop(app2, cfg, stop));

    Ok(mode.to_string())
}

/// Tuck the window away after consent so the candidate can focus on the
/// interview. Called by the UI shortly after the status screen appears.
#[tauri::command]
fn minimize_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.minimize();
    }
}

/// The candidate declined — stop and remove the agent.
#[tauri::command]
fn decline(app: AppHandle, state: State<'_, AppState>) {
    if let Some(stop) = state.stop.lock().unwrap().take() {
        stop.store(true, Ordering::Relaxed);
    }
    finish(&app, "declined");
}

fn map_signals(scan: &proctor_detect::ScanResult) -> Vec<SignalLite> {
    scan.signals
        .iter()
        .map(|s| SignalLite {
            severity: format!("{:?}", s.severity).to_lowercase(),
            process_name: s.process_name.clone(),
            window_title: s.window_title.clone(),
            detail: s.detail.clone(),
        })
        .collect()
}

/// The scan loop. With `cfg`, signs and sends reports; without, local-only.
fn run_loop(app: AppHandle, cfg: Option<AgentConfig>, stop: Arc<AtomicBool>) {
    let transport = HttpTransport;
    let interval = cfg
        .as_ref()
        .map(|c| c.scan_interval)
        .unwrap_or_else(|| Duration::from_secs(4));
    let mode = if cfg.is_some() { "live" } else { "demo" };
    let mut seq = 0u64;

    loop {
        if stop.load(Ordering::Relaxed) {
            return;
        }

        let scan = proctor_detect::scan(now_ms()).unwrap_or_else(|_| proctor_detect::evaluate(&[]));
        seq += 1;

        let mut connected = false;
        if let Some(cfg) = &cfg {
            let report = Report::new(&cfg.session_id, seq, now_ms(), scan.clone());
            if let Ok(body) = report.to_body() {
                let signature = sign(&cfg.hmac_secret, &body);
                match transport.send(
                    &cfg.events_url(),
                    &cfg.token,
                    &cfg.session_id,
                    &signature,
                    &body,
                ) {
                    SendOutcome::Ack(ack) => {
                        connected = true;
                        if ack.session_ended {
                            emit_status(&app, &scan, seq, true, mode);
                            finish(&app, "session_ended");
                            return;
                        }
                    }
                    SendOutcome::Revoked => {
                        emit_status(&app, &scan, seq, false, mode);
                        finish(&app, "revoked");
                        return;
                    }
                    SendOutcome::Transient(_) => {}
                }
            }
        }

        emit_status(&app, &scan, seq, connected, mode);

        // Sleep in short slices so Decline stops us promptly.
        let mut slept = Duration::ZERO;
        while slept < interval {
            if stop.load(Ordering::Relaxed) {
                return;
            }
            thread::sleep(Duration::from_millis(200));
            slept += Duration::from_millis(200);
        }
    }
}

fn emit_status(app: &AppHandle, scan: &proctor_detect::ScanResult, seq: u64, connected: bool, mode: &str) {
    let _ = app.emit(
        "proctor:status",
        StatusPayload {
            suspicion: scan.suspicion,
            scanned_windows: scan.scanned_windows,
            seq,
            connected,
            mode: mode.to_string(),
            signals: map_signals(scan),
        },
    );
}

/// End the session: tell the UI, then self-uninstall and exit.
fn finish(app: &AppHandle, reason: &str) {
    let _ = app.emit("proctor:ended", EndedPayload { reason: reason.to_string() });
    let app = app.clone();
    thread::spawn(move || {
        // Give the UI a moment to show the closing message.
        thread::sleep(Duration::from_secs(2));
        let _ = uninstall::self_destruct();
        app.exit(0);
    });
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            session_info,
            start_proctoring,
            minimize_window,
            decline
        ])
        .run(tauri::generate_context!())
        .expect("error while running proctor app");
}

//! `proctor-detect` — local detection of overlay / capture-excluded assist
//! tools (ParakeetAI, Cluely, interview-coder, …) for consent-based interview
//! proctoring.
//!
//! Design: the OS-specific [`platform::collect_windows`] gathers a list of
//! plain [`RawWindow`] facts; the pure [`evaluate`] function scores them into a
//! [`ScanResult`]. All scoring is platform-independent and unit-tested with
//! fixtures, so the heuristics can be validated on any OS / in CI without a
//! real overlay present.

mod platform;
pub mod signatures;
pub mod types;

pub use types::{DetectionSignal, RawWindow, ScanResult, Severity, SignalKind};

/// Weights (out of 100) each signal contributes to aggregate suspicion.
mod weight {
    pub const CAPTURE_EXCLUDED: u32 = 70;
    pub const CAPTURE_EXCLUDED_KNOWN: u32 = 95; // excluded AND signature-matched
    pub const OVERLAY_PROFILE: u32 = 35;
    pub const KNOWN_SIGNATURE: u32 = 60;
}

/// Collect live windows from the OS and score them. Returns `Err` only on a
/// hard platform failure; an empty/benign result is `Ok` with no signals.
pub fn scan(timestamp_ms: u64) -> Result<ScanResult, String> {
    let windows = platform::collect_windows()?;
    let mut result = evaluate(&windows);
    result.timestamp_ms = timestamp_ms;
    Ok(result)
}

/// Pure scorer: turn raw window facts into detection signals + an aggregate
/// score. No I/O, no OS calls — this is the unit under test.
pub fn evaluate(windows: &[RawWindow]) -> ScanResult {
    let mut signals = Vec::new();

    for w in windows {
        if !w.visible {
            continue;
        }

        let known = signatures::match_known_tool(&w.process_name, &w.process_path, &w.title);

        // 1) Capture exclusion — the strongest signal. A non-system window that
        //    hides from screen capture is almost always an assist overlay.
        if w.exclude_from_capture && !signatures::is_system_allowlisted(&w.process_name) {
            let (severity, weight, detail) = if let Some(name) = known {
                (
                    Severity::Critical,
                    weight::CAPTURE_EXCLUDED_KNOWN,
                    format!("'{name}' is running and hidden from screen capture"),
                )
            } else {
                (
                    Severity::Critical,
                    weight::CAPTURE_EXCLUDED,
                    "A window is hidden from screen capture but visible on the candidate's screen \
                     (display affinity set to exclude-from-capture)"
                        .to_string(),
                )
            };
            signals.push(DetectionSignal {
                kind: SignalKind::CaptureExcluded,
                severity,
                window_handle: w.handle,
                window_title: w.title.clone(),
                process_name: w.process_name.clone(),
                detail,
                weight,
            });
            // Already the top signal for this window; don't double-count profile.
            continue;
        }

        // 2) Known-signature match (even without capture exclusion).
        if let Some(name) = known {
            signals.push(DetectionSignal {
                kind: SignalKind::KnownSignature,
                severity: Severity::High,
                window_handle: w.handle,
                window_title: w.title.clone(),
                process_name: w.process_name.clone(),
                detail: format!("Known assist tool '{name}' has an active window"),
                weight: weight::KNOWN_SIGNATURE,
            });
            continue;
        }

        // 3) Overlay profile heuristic: classic always-on-top, transparent,
        //    click-through, no-taskbar window. Skip system surfaces.
        if is_overlay_profile(w) && !signatures::is_system_allowlisted(&w.process_name) {
            signals.push(DetectionSignal {
                kind: SignalKind::OverlayProfile,
                severity: Severity::Medium,
                window_handle: w.handle,
                window_title: w.title.clone(),
                process_name: w.process_name.clone(),
                detail: "An always-on-top, transparent, click-through window with no taskbar entry \
                         is open (overlay assistant profile)"
                    .to_string(),
                weight: weight::OVERLAY_PROFILE,
            });
        }
    }

    let suspicion = signals.iter().map(|s| s.weight).sum::<u32>().min(100);
    ScanResult {
        scanned_windows: windows.len(),
        signals,
        suspicion,
        timestamp_ms: 0,
    }
}

/// Heuristic: does this window look like a transparent always-on-top overlay
/// rather than a normal application window?
fn is_overlay_profile(w: &RawWindow) -> bool {
    // Must be a hidden-from-taskbar, always-on-top window…
    let stealthy = w.topmost && (w.toolwindow || !w.has_taskbar_button);
    // …with transparency and/or input pass-through (it overlays, doesn't take focus).
    let transparent = w.layered || w.click_through;
    stealthy && transparent
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> RawWindow {
        RawWindow {
            handle: 1,
            pid: 100,
            title: "Untitled".into(),
            process_name: "app.exe".into(),
            visible: true,
            ..Default::default()
        }
    }

    #[test]
    fn benign_window_produces_no_signal() {
        let w = RawWindow {
            title: "Document - Editor".into(),
            process_name: "editor.exe".into(),
            has_taskbar_button: true,
            ..base()
        };
        let r = evaluate(&[w]);
        assert_eq!(r.suspicion, 0);
        assert!(r.signals.is_empty());
    }

    #[test]
    fn capture_excluded_window_is_critical() {
        let w = RawWindow {
            exclude_from_capture: true,
            display_affinity: 0x11,
            ..base()
        };
        let r = evaluate(&[w]);
        assert_eq!(r.highest_severity(), Some(Severity::Critical));
        assert_eq!(r.signals[0].kind, SignalKind::CaptureExcluded);
        assert!(r.suspicion >= 70);
    }

    #[test]
    fn capture_excluded_plus_signature_is_max() {
        let w = RawWindow {
            title: "ParakeetAI".into(),
            process_name: "parakeet.exe".into(),
            exclude_from_capture: true,
            ..base()
        };
        let r = evaluate(&[w]);
        assert_eq!(r.suspicion, 95.min(100));
        assert!(r.signals[0].detail.contains("ParakeetAI"));
    }

    #[test]
    fn invisible_window_is_ignored() {
        let w = RawWindow {
            exclude_from_capture: true,
            visible: false,
            ..base()
        };
        assert_eq!(evaluate(&[w]).suspicion, 0);
    }

    #[test]
    fn system_overlay_not_flagged_on_profile() {
        // DWM-style: topmost + layered, but allowlisted -> no signal.
        let w = RawWindow {
            process_name: "dwm.exe".into(),
            topmost: true,
            layered: true,
            toolwindow: true,
            ..base()
        };
        assert!(evaluate(&[w]).signals.is_empty());
    }

    #[test]
    fn overlay_profile_window_is_medium() {
        let w = RawWindow {
            topmost: true,
            layered: true,
            click_through: true,
            toolwindow: true,
            has_taskbar_button: false,
            ..base()
        };
        let r = evaluate(&[w]);
        assert_eq!(r.signals.len(), 1);
        assert_eq!(r.signals[0].kind, SignalKind::OverlayProfile);
        assert_eq!(r.highest_severity(), Some(Severity::Medium));
    }

    #[test]
    fn browser_tab_mentioning_tool_is_not_flagged() {
        // Real-world false positive: a YouTube tab whose title mentions the tool.
        let w = RawWindow {
            process_name: "chrome.exe".into(),
            title: "job interview hack — #parakeetaiad - YouTube - Google Chrome".into(),
            has_taskbar_button: true,
            ..base()
        };
        let r = evaluate(&[w]);
        assert_eq!(r.suspicion, 0, "browser tab title should not signature-match");
    }

    #[test]
    fn tool_running_as_its_own_process_is_flagged() {
        // Positive control: the actual tool process is still caught by name.
        let w = RawWindow {
            process_name: "parakeet.exe".into(),
            title: "Meeting Assistant".into(),
            ..base()
        };
        let r = evaluate(&[w]);
        assert_eq!(r.signals[0].kind, SignalKind::KnownSignature);
        assert!(r.suspicion >= 60);
    }

    #[test]
    fn suspicion_saturates_at_100() {
        let mk = |h| RawWindow {
            handle: h,
            title: "ParakeetAI".into(),
            process_name: "parakeet.exe".into(),
            exclude_from_capture: true,
            ..base()
        };
        let r = evaluate(&[mk(1), mk(2)]);
        assert_eq!(r.suspicion, 100);
    }
}

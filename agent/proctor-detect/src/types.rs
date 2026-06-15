//! Platform-independent data types shared by the collector (OS-specific) and
//! the evaluator (pure, testable everywhere).

use serde::{Deserialize, Serialize};

/// Raw, un-scored facts about a single top-level window, as gathered by the
/// platform collector. The evaluator turns a list of these into signals.
///
/// Keeping this a plain data struct (no OS handles, no FFI types) is what lets
/// the scoring logic be unit-tested on macOS/Linux/CI with hand-built fixtures.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RawWindow {
    /// Opaque OS window id (HWND as u64 on Windows). For correlation only.
    pub handle: u64,
    pub pid: u32,
    pub title: String,
    /// Executable file name, lowercased, e.g. "parakeet.exe". Empty if unknown.
    pub process_name: String,
    /// Full executable path if resolvable, else empty.
    pub process_path: String,

    /// True when the OS reports this window is excluded from screen capture
    /// (Windows: display affinity == WDA_EXCLUDEFROMCAPTURE / WDA_MONITOR).
    /// This is the single strongest cheat signal: a normal app never hides
    /// itself from capture, but overlay assistants do so they stay invisible
    /// to the Zoom/Meet share while remaining visible to the candidate.
    pub exclude_from_capture: bool,
    /// Raw affinity value, for diagnostics. 0 == WDA_NONE.
    pub display_affinity: u32,

    // --- Overlay window profile (each individually weak, strong in combination) ---
    pub layered: bool,             // WS_EX_LAYERED  (alpha / per-pixel transparency)
    pub click_through: bool,       // WS_EX_TRANSPARENT (input passes through)
    pub topmost: bool,             // WS_EX_TOPMOST  (always-on-top)
    pub toolwindow: bool,          // WS_EX_TOOLWINDOW (no normal taskbar button)
    pub visible: bool,             // IsWindowVisible
    pub has_taskbar_button: bool,  // appears in the taskbar / alt-tab list
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Info,
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SignalKind {
    /// Window is hidden from screen capture but visible locally. Top signal.
    CaptureExcluded,
    /// Layered + topmost + click-through + no taskbar button: classic overlay.
    OverlayProfile,
    /// Process/title matches a known assist-tool signature.
    KnownSignature,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionSignal {
    pub kind: SignalKind,
    pub severity: Severity,
    pub window_handle: u64,
    pub window_title: String,
    pub process_name: String,
    /// Human-readable explanation for the interviewer-facing flag.
    pub detail: String,
    /// Contribution to the aggregate suspicion score (0..=100).
    pub weight: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub signals: Vec<DetectionSignal>,
    /// Aggregate 0..=100 suspicion, saturating sum of signal weights.
    pub suspicion: u32,
    pub scanned_windows: usize,
    /// Unix epoch millis the scan was taken (filled by caller).
    pub timestamp_ms: u64,
}

impl ScanResult {
    pub fn highest_severity(&self) -> Option<Severity> {
        self.signals.iter().map(|s| s.severity).max()
    }
}

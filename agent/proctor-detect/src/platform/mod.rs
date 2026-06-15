//! Platform dispatch. Each backend returns a `Vec<RawWindow>`; all scoring
//! lives in the platform-independent evaluator.

use crate::types::RawWindow;

#[cfg(windows)]
mod windows;

#[cfg(not(windows))]
mod fallback;

/// Enumerate the current desktop's top-level windows with the facts the
/// evaluator needs. On unsupported platforms this returns an empty list (the
/// macOS backend is Phase 5; see README).
pub fn collect_windows() -> Result<Vec<RawWindow>, String> {
    #[cfg(windows)]
    {
        windows::collect_windows()
    }
    #[cfg(not(windows))]
    {
        fallback::collect_windows()
    }
}

//! Non-Windows stub collector. Returns no windows so the crate builds and the
//! evaluator's unit tests run on any OS / CI. macOS support is Phase 5.

use crate::types::RawWindow;

pub fn collect_windows() -> Result<Vec<RawWindow>, String> {
    Ok(Vec::new())
}

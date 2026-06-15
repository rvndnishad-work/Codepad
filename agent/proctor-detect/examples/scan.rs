//! Live one-shot scan for manual testing on Windows.
//!
//!   cargo run --example scan            # human-readable
//!   cargo run --example scan -- --json  # machine-readable (what the agent sends)
//!
//! On non-Windows hosts this prints an empty/benign result (fallback collector).

fn now_ms() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn main() {
    let json = std::env::args().any(|a| a == "--json");
    let result = match proctor_detect::scan(now_ms()) {
        Ok(r) => r,
        Err(e) => {
            eprintln!("scan failed: {e}");
            std::process::exit(1);
        }
    };

    if json {
        println!("{}", serde_json::to_string_pretty(&result).unwrap());
        return;
    }

    println!(
        "Scanned {} windows — suspicion {}/100",
        result.scanned_windows, result.suspicion
    );
    if result.signals.is_empty() {
        println!("No overlay / capture-excluded windows detected.");
    }
    for s in &result.signals {
        println!(
            "  [{:?}] {:?} — {} (proc: {}, title: {:?})",
            s.severity, s.kind, s.detail, s.process_name, s.window_title
        );
    }
}

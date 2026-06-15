//! Known-tool signatures and a system allowlist.
//!
//! Signatures are a *secondary* signal — they're easily evaded by renaming the
//! binary, so the capture-exclusion and overlay-profile heuristics carry the
//! real weight. Signatures mainly let us label a flag with a confident name
//! ("ParakeetAI detected") when there's a match, and to raise severity.
//!
//! This list is intentionally data, not code, so it can later be served from
//! the backend and updated without shipping a new agent build.

/// A match rule. A window matches if ANY of its process substrings appear in
/// the (lowercased) process name/path, OR any title substring appears in the
/// (lowercased) window title.
pub struct Signature {
    pub name: &'static str,
    pub process_substrings: &'static [&'static str],
    pub title_substrings: &'static [&'static str],
}

/// Seed list of overlay AI-assist / interview-cheat tools. Lowercase only.
pub const KNOWN_TOOLS: &[Signature] = &[
    Signature {
        name: "ParakeetAI",
        process_substrings: &["parakeet"],
        title_substrings: &["parakeet"],
    },
    Signature {
        name: "Cluely",
        process_substrings: &["cluely"],
        title_substrings: &["cluely"],
    },
    Signature {
        name: "Interview Coder",
        process_substrings: &["interview-coder", "interviewcoder"],
        title_substrings: &["interview coder"],
    },
    Signature {
        name: "Final Round AI",
        process_substrings: &["finalround", "final-round"],
        title_substrings: &["final round"],
    },
    Signature {
        name: "LockedIn AI",
        process_substrings: &["lockedin", "locked-in"],
        title_substrings: &["lockedin ai"],
    },
];

/// Windows whose process matches one of these is treated as a legitimate
/// system overlay and never flagged on profile alone (it can still be flagged
/// by an explicit signature match, which never happens for these). Lowercase.
pub const SYSTEM_ALLOWLIST: &[&str] = &[
    "dwm.exe",                  // Desktop Window Manager
    "explorer.exe",             // Shell / taskbar / start menu
    "textinputhost.exe",        // Touch keyboard / IME
    "shellexperiencehost.exe",  // Action center, etc.
    "searchhost.exe",
    "startmenuexperiencehost.exe",
    "applicationframehost.exe", // UWP host
    "nvcontainer.exe",          // NVIDIA overlay shell (legit, configurable)
    "lockapp.exe",
];

/// Browser processes. A browser's *window title* is page content, not app
/// identity, so title-based signature matching is suppressed for these (a
/// YouTube tab titled "parakeetai" is not the tool running). Lowercase.
pub const BROWSER_PROCESSES: &[&str] = &[
    "chrome.exe",
    "msedge.exe",
    "firefox.exe",
    "brave.exe",
    "opera.exe",
    "arc.exe",
    "vivaldi.exe",
    "chromium.exe",
];

fn is_browser(process_name: &str) -> bool {
    let proc = process_name.to_ascii_lowercase();
    BROWSER_PROCESSES.iter().any(|s| proc == *s)
}

/// Returns the tool name if `process_name`/`title` (any case) matches a known
/// signature. Title matches are ignored for browser processes to avoid
/// flagging tabs that merely mention a tool by name.
pub fn match_known_tool(process_name: &str, process_path: &str, title: &str) -> Option<&'static str> {
    let proc = process_name.to_ascii_lowercase();
    let path = process_path.to_ascii_lowercase();
    let title = title.to_ascii_lowercase();
    let allow_title = !is_browser(process_name);
    for sig in KNOWN_TOOLS {
        let proc_hit = sig
            .process_substrings
            .iter()
            .any(|s| proc.contains(s) || path.contains(s));
        let title_hit = allow_title && sig.title_substrings.iter().any(|s| title.contains(s));
        if proc_hit || title_hit {
            return Some(sig.name);
        }
    }
    None
}

/// True when the process is a known-legitimate system surface that we should
/// not flag on the overlay-profile heuristic alone.
pub fn is_system_allowlisted(process_name: &str) -> bool {
    let proc = process_name.to_ascii_lowercase();
    SYSTEM_ALLOWLIST.iter().any(|s| proc == *s)
}

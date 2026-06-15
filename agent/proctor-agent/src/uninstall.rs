//! Clean self-uninstall ("self-destruct" done honestly).
//!
//! The agent ships as a portable binary in a temp directory and keeps all state
//! in memory. When the session ends it removes its own files and exits. On
//! Windows a running .exe can't delete itself, so we spawn a short-lived,
//! detached `cmd` that waits for our process to exit, then deletes the exe and
//! its directory. No registry keys, no service, no driver — nothing to clean up
//! beyond the temp files, which is the whole point.

use std::path::Path;
use std::process::Command;

/// Build the (program, args) for the detached self-delete helper, given the
/// path to the running executable. Pure/parameterized so it can be unit-tested
/// without actually deleting anything.
#[cfg(windows)]
pub fn build_self_delete_command(exe_path: &Path) -> (String, Vec<String>) {
    let exe = exe_path.display().to_string();
    let dir = exe_path
        .parent()
        .map(|p| p.display().to_string())
        .unwrap_or_default();

    // ping provides a portable ~2s delay (no reliance on `timeout`, which needs
    // a console). Then force-delete the exe; then best-effort remove the dir.
    let script = format!(
        "ping 127.0.0.1 -n 3 > nul & del /f /q \"{exe}\" & rmdir /s /q \"{dir}\"",
        exe = exe,
        dir = dir,
    );
    (
        "cmd".to_string(),
        vec!["/C".to_string(), script],
    )
}

#[cfg(not(windows))]
pub fn build_self_delete_command(exe_path: &Path) -> (String, Vec<String>) {
    let exe = exe_path.display().to_string();
    let dir = exe_path
        .parent()
        .map(|p| p.display().to_string())
        .unwrap_or_default();
    // POSIX: sleep briefly, remove the binary, then the dir.
    let script = format!("sleep 1; rm -f '{exe}'; rmdir '{dir}' 2>/dev/null || true");
    ("sh".to_string(), vec!["-c".to_string(), script])
}

/// Spawn the detached self-delete helper and return so the caller can exit.
/// The helper outlives this process and removes the binary once we're gone.
pub fn self_destruct() -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| format!("current_exe: {e}"))?;
    let (program, args) = build_self_delete_command(&exe);
    Command::new(program)
        .args(args)
        .spawn()
        .map_err(|e| format!("spawn self-delete helper: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn command_references_exe_and_dir() {
        let p = if cfg!(windows) {
            PathBuf::from(r"C:\Temp\proctor\agent.exe")
        } else {
            PathBuf::from("/tmp/proctor/agent")
        };
        let (program, args) = build_self_delete_command(&p);
        assert!(!program.is_empty());
        let joined = args.join(" ");
        assert!(joined.contains("agent"), "must target the exe: {joined}");
        assert!(joined.contains("proctor"), "must target the dir: {joined}");
    }
}

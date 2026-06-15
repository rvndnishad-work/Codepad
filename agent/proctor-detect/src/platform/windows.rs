//! Windows collector. Enumerates top-level windows and reads the facts the
//! evaluator scores — crucially the *display affinity*, which is how overlay
//! assist tools mark themselves "exclude from screen capture".
//!
//! NOTE: this is the only module that touches the Win32 FFI. It must be
//! compiled and exercised on Windows (`cargo test` on a non-Windows host runs
//! the evaluator tests against the fallback collector only). See README.

use crate::types::RawWindow;
use windows::core::PWSTR;
use windows::Win32::Foundation::{CloseHandle, BOOL, HANDLE, HWND, LPARAM, MAX_PATH, TRUE};
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
    PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindow, GetWindowDisplayAffinity, GetWindowLongPtrW, GetWindowTextLengthW,
    GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible, GWL_EXSTYLE, GW_OWNER,
    WDA_EXCLUDEFROMCAPTURE, WDA_MONITOR, WS_EX_APPWINDOW, WS_EX_LAYERED,
    WS_EX_TOOLWINDOW, WS_EX_TOPMOST, WS_EX_TRANSPARENT,
};

pub fn collect_windows() -> Result<Vec<RawWindow>, String> {
    let mut acc: Vec<RawWindow> = Vec::new();
    // SAFETY: EnumWindows invokes `enum_proc` synchronously for each top-level
    // window before returning; we hand it a pointer to our local Vec.
    unsafe {
        let lparam = LPARAM(&mut acc as *mut Vec<RawWindow> as isize);
        EnumWindows(Some(enum_proc), lparam)
            .map_err(|e| format!("EnumWindows failed: {e}"))?;
    }
    Ok(acc)
}

unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let acc = &mut *(lparam.0 as *mut Vec<RawWindow>);

    let visible = IsWindowVisible(hwnd).as_bool();
    // Cheap fast-path: skip invisible windows entirely (the evaluator would too).
    if !visible {
        return TRUE;
    }

    let title = window_text(hwnd);
    let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE) as u32;

    let layered = ex_style & WS_EX_LAYERED.0 != 0;
    let click_through = ex_style & WS_EX_TRANSPARENT.0 != 0;
    let topmost = ex_style & WS_EX_TOPMOST.0 != 0;
    let toolwindow = ex_style & WS_EX_TOOLWINDOW.0 != 0;
    let appwindow = ex_style & WS_EX_APPWINDOW.0 != 0;

    // Taskbar-button heuristic (matches the shell's own rule closely enough):
    // a window gets a taskbar button if it is forced via WS_EX_APPWINDOW, or it
    // is an unowned, non-tool window.
    let owner = GetWindow(hwnd, GW_OWNER).unwrap_or_default();
    let has_taskbar_button = appwindow || (!toolwindow && owner.0.is_null());

    // Display affinity — the key signal. The API writes a raw u32; compare it
    // against the WDA_* constants (which are WINDOW_DISPLAY_AFFINITY newtypes).
    let mut affinity: u32 = 0;
    let _ = GetWindowDisplayAffinity(hwnd, &mut affinity);
    let exclude_from_capture =
        affinity == WDA_EXCLUDEFROMCAPTURE.0 || affinity == WDA_MONITOR.0;

    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));
    let (process_name, process_path) = process_image(pid);

    acc.push(RawWindow {
        handle: hwnd.0 as u64,
        pid,
        title,
        process_name,
        process_path,
        exclude_from_capture,
        display_affinity: affinity,
        layered,
        click_through,
        topmost,
        toolwindow,
        visible,
        has_taskbar_button,
    });

    TRUE
}

/// Read a window's title text into a Rust String.
unsafe fn window_text(hwnd: HWND) -> String {
    let len = GetWindowTextLengthW(hwnd);
    if len <= 0 {
        return String::new();
    }
    let mut buf = vec![0u16; len as usize + 1];
    let copied = GetWindowTextW(hwnd, &mut buf);
    String::from_utf16_lossy(&buf[..copied as usize])
}

/// Resolve a pid to (lowercased file name, full path). Empty strings on failure
/// (e.g. a higher-integrity / protected process we can't open).
unsafe fn process_image(pid: u32) -> (String, String) {
    if pid == 0 {
        return (String::new(), String::new());
    }
    let handle: HANDLE = match OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
        Ok(h) => h,
        Err(_) => return (String::new(), String::new()),
    };

    let mut buf = vec![0u16; MAX_PATH as usize];
    let mut size = buf.len() as u32;
    let path = match QueryFullProcessImageNameW(
        handle,
        PROCESS_NAME_WIN32,
        PWSTR(buf.as_mut_ptr()),
        &mut size,
    ) {
        Ok(()) => String::from_utf16_lossy(&buf[..size as usize]),
        Err(_) => String::new(),
    };
    let _ = CloseHandle(handle);

    let name = path
        .rsplit(['\\', '/'])
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    (name, path)
}

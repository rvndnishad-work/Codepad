# Interview Proctor Agent

A **consent-based** desktop agent that detects overlay AI-assist / interview-cheat
tools (ParakeetAI, Cluely, interview-coder, …) on the candidate's machine during
a live or take-home interview, and flags the interviewer in real time.

It exists because the browser **cannot** see these tools: they render a
transparent, always-on-top overlay that is *excluded from screen capture*, so it
is invisible to the Zoom/Meet share but visible to the candidate. The agent runs
locally, where the overlay is fully visible, and reports the discrepancy.

## Principles (read before extending)

- **Consent, not stealth.** The candidate installs it knowingly via a one-time
  token link and sees exactly what is monitored. We do **not** hide the agent
  from the candidate or build anti-forensic behavior.
- **Self-destruct = clean uninstall.** Ship as a portable temp-dir binary with
  in-memory state; on session end it removes itself and revokes its token. The
  selling point is "we leave nothing on your machine," not "leave no trace."
- **Local detection only.** The agent reports *signals* (e.g. "a capture-excluded
  window is open"), never screenshots of the candidate's private content.

## Layout

```
agent/
  proctor-detect/         Phase 1 — detection core (this crate)
    src/
      types.rs            Plain data types (RawWindow, ScanResult, signals)
      signatures.rs       Known-tool signatures + system allowlist
      lib.rs              evaluate() — the pure, tested scorer + scan()
      platform/
        mod.rs            cfg dispatch
        windows.rs        Win32 collector (display affinity = key signal)
        fallback.rs       no-op collector for non-Windows / CI
    examples/scan.rs      live one-shot scan CLI
```

  proctor-agent/          Phase 2 — agent runtime (✅ built & tested)
    src/
      config.rs           env-driven config + consent gate
      report.rs           wire contract (Report) + HMAC-SHA256 signing
      runtime.rs          scan→sign→send loop behind a Transport trait
      transport.rs        ureq HTTP impl (maps 401/403/410 → revoked)
      uninstall.rs        clean self-delete (detached helper)
      main.rs             modes: (loop) / --dry-run / --scan

Phase 3 — backend ingest (✅ built & verified end-to-end, in the Next.js app):
- migration `20260614000000_proctor_agent_reports` (`ProctorAgentReport` +
  `InterviewSession.proctorToken`/`proctorSecret`)
- `src/lib/proctoring/agent.ts` (HMAC verify, credential issue, session-ended)
- `POST /api/interview/[id]/proctor/token` — owner issues agent creds
- `POST /api/interview/[id]/proctor/events` — bearer+HMAC ingest, rolls up
  into `InterviewSession.aiSuspicionScore` (max of browser vs native)

  proctor-app/            Phase 5 — Tauri consent GUI + installer
    src/main.rs           consent commands + status-streaming scan loop
    ui/index.html         consent screen → live status → ended (vanilla JS)
    tauri.conf.json       window + NSIS bundle config
    capabilities/         Tauri v2 permissions

Phase 4 — interviewer UI (✅ built & verified, in the Next.js app):
- report page "Screen Proctor Agent" section + `ProctorLiveBadge` live panel
- `GET /api/interview/[id]/proctor/status`

Later phases (see `project_proctor_agent` memory):
6. macOS collector (Screen Recording permission; weaker, `sharingType`)

## proctor-app (Tauri consent shell)

Wraps the runtime in a GUI that gets explicit candidate consent before any
scanning, streams live status to the window, and self-uninstalls when the
session ends. Launched with backend env (`PROCTOR_*`) it signs + sends reports;
launched standalone it runs a **local detection demo** (scan + display, no
network) so the build can be tried without a backend.

```powershell
cargo install tauri-cli --version "^2.0" --locked   # one-time
cd agent/proctor-app
cargo tauri icon icon-src.png        # regenerate icons/ from the source png
cargo tauri dev                      # run the consent app
cargo tauri build                    # produce the NSIS installer
```

### Build gotchas

- **brotli dependency skew (committed Cargo.lock).** Tauri pulls `brotli 8.0.3`,
  which requires `alloc-no-stdlib ^2` while `alloc-stdlib`/`brotli-decompressor`
  allow `<4`, so cargo otherwise resolves a second `alloc-no-stdlib 3.0.0` and
  `StandardAlloc` ends up implementing the wrong-version `Allocator` trait
  (compile error: `StandardAlloc: alloc::Allocator<…> is not satisfied`). The
  committed `Cargo.lock` pins `alloc-no-stdlib = 2.0.4` for everyone. If you ever
  regenerate the lock and hit this, re-apply:
  `cargo update -p alloc-no-stdlib@3.0.0 --precise 2.0.4`.
- **Toolchain.** Builds on stable (1.96 here). edition2024 deps in the lock need
  Cargo ≥ 1.85.

## Wire contract (agent → backend) — the Phase 3 spec

`POST {PROCTOR_BACKEND_URL}/events`

Headers:
- `Authorization: Bearer <one-time token>`
- `X-Proctor-Session: <session id>`
- `X-Proctor-Signature: <hex HMAC-SHA256(hmac_secret, raw_body)>`
- `Content-Type: application/json`

Body (compact JSON):
```json
{ "session_id": "...", "seq": 1, "sent_at_ms": 0,
  "agent_version": "0.1.0", "scan": { /* ScanResult */ } }
```

Backend MUST: verify the bearer token → look up the session's `hmac_secret` →
recompute the HMAC over the *raw received bytes* → constant-time compare. Use
`seq` to drop replays/gaps. Respond `{"session_ended": bool}`; set `true` (or
return 410) to make the agent stop and self-uninstall.

Verify locally without a backend:
```powershell
$env:PROCTOR_SESSION_ID="s"; $env:PROCTOR_BACKEND_URL="https://x/proctor"
$env:PROCTOR_TOKEN="t"; $env:PROCTOR_HMAC_SECRET="k"; $env:PROCTOR_CONSENT_GRANTED="1"
cargo run -p proctor-agent -- --dry-run   # prints the signed report, sends nothing
```

## How detection scores

Per visible top-level window, strongest signal wins:

| Signal | Severity | Weight |
|---|---|---|
| Capture-excluded **and** known signature | Critical | 95 |
| Capture-excluded (display affinity excludes capture) | Critical | 70 |
| Known-tool signature match | High | 60 |
| Overlay profile (topmost + transparent + click-through + no taskbar) | Medium | 35 |

Aggregate suspicion is the saturating sum (0–100). System surfaces (DWM,
shell, IME hosts) are allowlisted so they don't trip the profile heuristic.

## Build & test

Requires the Rust toolchain (not yet installed on this machine):

```powershell
# install once: https://rustup.rs  (winget install Rustlang.Rustup)
cd agent/proctor-detect

cargo test              # evaluator unit tests — run on ANY OS
cargo run --example scan        # live scan (real signals only on Windows)
cargo run --example scan -- --json
```

### Verification status

- `evaluate()` scoring logic — 9 unit tests in `lib.rs`. ✅ **passing** (rustc 1.96,
  Windows). Includes a regression test for the browser-tab false positive below.
- `platform/windows.rs` (Win32 FFI) — ✅ **compiles and runs on Windows**; a live
  `cargo run --example scan` enumerated real windows and correctly scored them.
- Still TODO: confirm the capture-exclusion read against an actual overlay tool
  with `WDA_EXCLUDEFROMCAPTURE` set (the synthetic + signature paths are proven;
  the live affinity==exclude path hasn't fired on a real tool yet).

#### Field note — browser-title false positive (fixed)
The first live scan flagged a *YouTube tab* whose title mentioned "parakeetai" as
the tool running. Signature title-matching is now suppressed for browser
processes (`signatures::BROWSER_PROCESSES`); process-name matching still applies,
since real tools (often Electron) have their own process. Suspicion for that
scan dropped 95 → 35 after the fix.

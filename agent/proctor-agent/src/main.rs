//! Interview proctor agent — runtime entry point.
//!
//! Modes:
//!   proctor-agent              run the consent-gated scan/report loop
//!   proctor-agent --dry-run    one scan; print the signed report it WOULD send
//!                              (no network) — used to verify the contract
//!   proctor-agent --scan       one local scan, human-readable (no config needed)
//!
//! Config comes from the environment (set by the one-time launcher link):
//!   PROCTOR_SESSION_ID, PROCTOR_BACKEND_URL, PROCTOR_TOKEN, PROCTOR_HMAC_SECRET,
//!   PROCTOR_CONSENT_GRANTED=1, PROCTOR_SCAN_INTERVAL_SECS (optional).

use proctor_agent::config::AgentConfig;
use proctor_agent::report::{sign, Report};
use proctor_agent::{now_ms, runtime, transport, uninstall};

fn main() {
    let args: Vec<String> = std::env::args().collect();

    // --scan: pure local detection, no config, no network. Handy smoke test.
    if args.iter().any(|a| a == "--scan") {
        match proctor_detect::scan(now_ms()) {
            Ok(r) => println!("{}", serde_json::to_string_pretty(&r).unwrap()),
            Err(e) => {
                eprintln!("scan failed: {e}");
                std::process::exit(1);
            }
        }
        return;
    }

    let cfg = match AgentConfig::load() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("config error: {e}");
            std::process::exit(2);
        }
    };

    // --dry-run: build + sign exactly one report and print it, send nothing.
    // Lets us verify the wire contract end-to-end without a backend.
    if args.iter().any(|a| a == "--dry-run") {
        let scan = proctor_detect::scan(now_ms()).unwrap_or_else(|_| proctor_detect::evaluate(&[]));
        let rep = Report::new(&cfg.session_id, 1, now_ms(), scan);
        let body = rep.to_body().expect("serialize");
        let signature = sign(&cfg.hmac_secret, &body);
        println!("POST {}", cfg.events_url());
        println!("Authorization: Bearer {}", cfg.token);
        println!("X-Proctor-Session: {}", cfg.session_id);
        println!("X-Proctor-Signature: {signature}");
        println!("consent_granted: {}", cfg.consent_granted);
        println!("\n{}", String::from_utf8_lossy(&body));
        return;
    }

    if !cfg.consent_granted {
        eprintln!("refusing to start: candidate consent not granted");
        std::process::exit(3);
    }

    // --once: send exactly one real report to the backend, print the outcome,
    // and exit. Used to verify the live ingest path end-to-end.
    if args.iter().any(|a| a == "--once") {
        use runtime::{SendOutcome, Transport};
        let scan = proctor_detect::scan(now_ms()).unwrap_or_else(|_| proctor_detect::evaluate(&[]));
        let rep = Report::new(&cfg.session_id, 1, now_ms(), scan);
        let body = rep.to_body().expect("serialize");
        let signature = sign(&cfg.hmac_secret, &body);
        match transport::HttpTransport.send(
            &cfg.events_url(),
            &cfg.token,
            &cfg.session_id,
            &signature,
            &body,
        ) {
            SendOutcome::Ack(ack) => {
                println!("ACK session_ended={}", ack.session_ended);
            }
            SendOutcome::Revoked => {
                eprintln!("REVOKED (auth rejected)");
                std::process::exit(4);
            }
            SendOutcome::Transient(e) => {
                eprintln!("TRANSIENT {e}");
                std::process::exit(5);
            }
        }
        return;
    }

    let mut rt = runtime::Runtime::new(
        cfg,
        transport::HttpTransport,
        Box::new(now_ms),
        Box::new(|| proctor_detect::scan(now_ms())),
    );

    let should_uninstall = rt.run();
    if should_uninstall {
        if let Err(e) = uninstall::self_destruct() {
            eprintln!("self-uninstall failed: {e}");
        }
    }
}

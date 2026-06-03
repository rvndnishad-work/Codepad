# Piston code-execution backend

The untrusted-code judge (`/api/execute`, `/api/challenges/[slug]/grade`) runs all candidate
code on **Piston** — never on the app server. Piston needs **privileged Docker + pure cgroup
v2**, so where it can run is constrained.

## Where Piston can run
| Host | Works? | Notes |
|---|---|---|
| **Local Docker** | ✅ | `docker-compose.piston.yml` in the repo root. Use for local dev. |
| **DigitalOcean / any Ubuntu 22.04+ VM** | ✅ | Native pure cgroup v2 → works out of the box. **Production path.** See [`DROPLET.md`](DROPLET.md). |
| **Fly.io Machines** | ❌ | Firecracker VMs run *hybrid* cgroups with cpu/memory/pids on v1; Piston's isolate needs them on v2, and Fly doesn't expose kernel cgroup args. Confirmed dead end. |
| **Vercel / serverless** | ❌ | No privileged Docker, ephemeral. |
| **Public Piston (emkc.org)** | ❌ | Whitelist-only since 2026-02-15 — no longer executes code. |

## Files here
- [`DROPLET.md`](DROPLET.md) — full production runbook (provision, DNS, firewall, deploy, TLS).
- `docker-compose.droplet.yml` — Piston (privileged, internal-only) + Caddy auth proxy.
- `Caddyfile.droplet` — `/healthz` open + bearer-gated reverse proxy to `piston:2000`.

## Security model (same everywhere it's hosted)
Piston has no auth. Anywhere it's exposed to the internet, it sits behind **Caddy** which
terminates TLS and requires `Authorization: Bearer <PISTON_AUTH_TOKEN>` (the same value the
app sends via the `PISTON_AUTH_TOKEN` env var). Piston binds internally and is never directly
reachable. Local dev needs no proxy/token (it's `localhost:2000`).

## Language packs
Piston ships with **zero** languages. Install the 7 the app needs with the repo's
`scripts/piston-install-langs.mjs` (drives Piston's REST API — there is no `ppman` CLI):
```sh
# local docker:
node scripts/piston-install-langs.mjs
# remote (droplet), through the proxy:
PISTON_URL=https://piston.yourdomain.com PISTON_AUTH_TOKEN=<token> node scripts/piston-install-langs.mjs
```

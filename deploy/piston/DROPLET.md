# Piston on a DigitalOcean droplet

The untrusted-code judge (`/api/execute`, `/api/challenges/[slug]/grade`) runs all candidate
code on **Piston**. Piston needs privileged Docker + **pure cgroup v2**, which Ubuntu 22.04+
provides natively — so it works out of the box here (unlike Fly Machines, whose hybrid
cgroups Piston rejects).

```
Vercel app ──HTTPS+Bearer──▶ Caddy (:443, public, TLS) ──▶ Piston (:2000, internal only)
```

## Files
- `docker-compose.droplet.yml` — Piston (privileged, internal-only) + Caddy auth proxy.
- `Caddyfile.droplet` — `/healthz` (open) + bearer-gated reverse proxy to `piston:2000`.

## 1. Droplet
- **Ubuntu 22.04 or 24.04 LTS**, **2 vCPU / 2 GB** (≈$18/mo) — comfortable for the 7-language
  judge. (1 GB risks OOM on Rust/Java compiles.)
- Add your SSH key; optionally attach a **Reserved IP** so the address is stable.

## 2. DNS
Create an **A record** for a subdomain → the droplet's IP, e.g.
`piston.yourdomain.com → 203.0.113.10`. Caddy needs it to get a Let's Encrypt cert.

## 3. Firewall (DigitalOcean Cloud Firewall, free)
Inbound allow **only**:
- `443/tcp` (and `80/tcp` for the ACME cert challenge) from anywhere
- `22/tcp` from **your IP only**

Block everything else. Piston's `2000` is never published to the host, so it's unreachable
from outside regardless.

## 4. Install Docker + deploy
```sh
# on the droplet
curl -fsSL https://get.docker.com | sh

# copy this folder up (from your machine):  scp -r deploy/piston root@<ip>:/opt/piston
cd /opt/piston

# config for the compose (NOT committed):
cat > .env <<'EOF'
PISTON_DOMAIN=piston.yourdomain.com
PISTON_AUTH_TOKEN=__PASTE_openssl_rand_hex_32__
EOF

docker compose -f docker-compose.droplet.yml up -d
docker compose -f docker-compose.droplet.yml logs -f caddy   # watch TLS cert issue
```

## 5. Install language packs (once)
Piston starts with zero languages. Run the installer from your **local repo** against the live
proxy (it drives Piston's REST API; idempotent):
```sh
PISTON_URL=https://piston.yourdomain.com \
PISTON_AUTH_TOKEN=<token> \
node scripts/piston-install-langs.mjs
```

## 6. Verify lockdown
```sh
curl https://piston.yourdomain.com/api/v2/runtimes                                  # 401
curl -H "Authorization: Bearer <token>" https://piston.yourdomain.com/api/v2/runtimes  # JSON of 7 runtimes
```

## 7. Wire the Vercel app
Set on the Vercel project (Production + Preview):
- `PISTON_URL = https://piston.yourdomain.com`
- `PISTON_AUTH_TOKEN = <token>`

## Notes
- **Cost:** a droplet bills 24/7 flat (no scale-to-zero). Fine for production; for pre-launch
  dev you can keep using your **local** Docker Piston and only provision this when you need the
  *deployed* app to execute code.
- **Updates:** `docker compose -f docker-compose.droplet.yml pull && ... up -d` to update Piston;
  installed packs persist in the `piston-packages` volume.

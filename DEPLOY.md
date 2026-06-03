# Deploying Codepad (Vercel + Fly.io)

First-spin production runbook. Two pieces of infrastructure:

| Piece | Where | Why |
|---|---|---|
| Next.js app | **Vercel** | Serverless Next.js host. |
| PostgreSQL | **Vercel Postgres** (Neon) | SQLite can't run on Vercel's ephemeral filesystem. |
| Piston (code judge) | **Ubuntu droplet** (DigitalOcean) | Needs privileged Docker + pure cgroup v2; can't run on Vercel or Fly. See [`deploy/piston/`](deploy/piston/README.md). |

The app and Piston talk over HTTPS with a shared bearer token. Everything else is env-var config.

---

## 0. Prerequisites
- Vercel account + `vercel` CLI (or just the dashboard).
- Fly.io account + `flyctl`.
- This repo pushed to GitHub (Vercel deploys from it).
- `openssl` for generating secrets.

---

## 1. Provision Postgres (Vercel Postgres)
1. Vercel dashboard → **Storage → Create → Postgres** → attach it to the project.
2. Vercel injects `POSTGRES_PRISMA_URL` (pooled) and `POSTGRES_URL_NON_POOLING` (direct).
   Our Prisma datasource reads `DATABASE_URL` + `DIRECT_URL`, so add these two env vars
   mapping to those values (Project → Settings → Environment Variables):
   - `DATABASE_URL` = value of `POSTGRES_PRISMA_URL`
   - `DIRECT_URL`   = value of `POSTGRES_URL_NON_POOLING`

The build runs `prisma migrate deploy` automatically (see `package.json` `build`), so the
schema is created/updated on every deploy. No manual `db push` — ever.

---

## 2. Deploy Piston (Ubuntu droplet)
Piston needs privileged Docker + pure cgroup v2 — it can't run on Vercel or Fly (Fly's
hybrid cgroups break it). Use an **Ubuntu 22.04+ droplet**; full runbook in
[`deploy/piston/DROPLET.md`](deploy/piston/DROPLET.md). Short version:
```sh
# on the droplet (Docker installed), in /opt/piston with this folder copied up:
cat > .env <<'EOF'
PISTON_DOMAIN=piston.yourdomain.com
PISTON_AUTH_TOKEN=__openssl_rand_hex_32__
EOF
docker compose -f docker-compose.droplet.yml up -d
# install the 7 language packs from your local repo, through the proxy:
PISTON_URL=https://piston.yourdomain.com PISTON_AUTH_TOKEN=<token> node scripts/piston-install-langs.mjs
```
Verify it's locked down:
```sh
curl https://piston.yourdomain.com/api/v2/runtimes                                  # 401
curl -H "Authorization: Bearer <token>" https://piston.yourdomain.com/api/v2/runtimes  # JSON
```
> **Pre-launch shortcut:** while still building, skip the droplet and keep using your **local**
> Docker Piston for local dev. Provision the droplet when the *deployed* app needs to run code.

---

## 3. Configure Vercel env vars
Set these on the Vercel project (Production, and Preview if you want previews to work).
Generate every secret fresh — **do not reuse local dev values**.

### Required
| Var | Value |
|---|---|
| `DATABASE_URL` | = `POSTGRES_PRISMA_URL` (step 1) |
| `DIRECT_URL` | = `POSTGRES_URL_NON_POOLING` (step 1) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `NEXTAUTH_URL` | your `https://<app>.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | same `https://<app>.vercel.app` |
| `ADMIN_EMAILS` | comma-separated admin emails |
| `ENCRYPTION_KEY_BASE64` | `openssl rand -base64 32` — **set once**, rotating it breaks all stored 2FA/MCP secrets |
| `CRON_SECRET` | `openssl rand -hex 32` (protects `/api/cron/*`) |
| `PISTON_URL` | `https://piston.yourdomain.com` (your droplet) |
| `PISTON_AUTH_TOKEN` | the token from step 2 |

### Recommended (multi-instance correctness)
| Var | Value |
|---|---|
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | from an Upstash Redis DB — distributed rate limiting + execute cache. Without it each Vercel instance has its own in-memory limiter. |

### Optional (set per feature you enable)
- **AI/voice:** `GEMINI_API_KEY` (+ `AI_INTERVIEW_GEMINI_MODEL`, `ADMIN_COPILOT_MODEL`),
  `OPENAI_API_KEY` (+ `OPENAI_TTS_MODEL`/`OPENAI_TTS_VOICE`),
  `ELEVENLABS_API_KEY`/`ELEVENLABS_VOICE_ID`/`ELEVENLABS_MODEL`,
  `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`.
- **Email (Resend):** `RESEND_API_KEY`. Leave `EMAIL_FROM` unset for test mode
  (`onboarding@resend.dev`). Set `RESEND_WEBHOOK_SECRET` only after configuring the webhook.
- **Billing:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- **OAuth:** `AUTH_GITHUB_ID/SECRET`, `AUTH_GOOGLE_ID/SECRET`, `AUTH_FACEBOOK_ID/SECRET`.
  Callback URL pattern: `https://<app>.vercel.app/api/auth/callback/<provider>`.

---

## 4. First deploy
Push to the deploy branch (or `vercel --prod`). The build runs
`prisma generate && prisma migrate deploy && next build`, creating the schema in the empty
Postgres DB on the first build.

---

## 5. Seed the fresh database (once)
From a machine with the **prod `DIRECT_URL`** exported (NOT the pooled URL):
```sh
export DATABASE_URL='<POSTGRES_URL_NON_POOLING>'
export DIRECT_URL="$DATABASE_URL"
npx tsx prisma/seed-interview-prep.ts      # multi-language DSA bank (required by the judge)
# Optional catalog seeds, as desired:
# npx tsx prisma/seed-challenges.ts
# npx tsx prisma/seed-blogs.ts
# npx tsx prisma/seed-prompt-scenarios.ts
# npx tsx prisma/seed-prompt-exemplars.ts
```
The admin account is whatever email you put in `ADMIN_EMAILS` — sign in with it to get
`/admin` access. Do **not** seed the dev test challenges/tokens into prod.

---

## 6. Smoke test (post-deploy)
1. App loads at `https://<app>.vercel.app`; sign in.
2. **Code execution:** open a playground, run code in a couple of languages → real output
   (this proves the Vercel → droplet Piston path + bearer auth).
3. **Judge (admin):** `/admin` challenge authoring → build a contract → **Validate** → save a
   harness challenge.
4. **Judge (candidate):** attempt it → **Run** then **Submit**, both a correct and a wrong
   solution. In the browser Network tab confirm the grade response contains **no** reference
   solutions or hidden expected outputs.
5. **Cron:** confirm the hourly `telemetry-scan` cron (in `vercel.json`) shows up under the
   Vercel project's Cron tab and returns 200 (it's gated by `CRON_SECRET`).

---

## Notes & follow-ups
- **Local dev now needs Postgres too** (the schema provider is `postgresql`). Run a local
  Postgres or use a Neon dev branch; set `DATABASE_URL`/`DIRECT_URL` in `.env`. This keeps the
  prod DB and your local/test DB separate (the start of admin-todo **IP-62**).
- **Custom domain / real email:** when you add a domain, update `NEXTAUTH_URL`,
  `NEXT_PUBLIC_SITE_URL`, OAuth callbacks, verify the domain in Resend, and set `EMAIL_FROM`.
- **More crons (IP-63):** only `telemetry-scan` is wired today; add the other `/api/cron/*`
  endpoints to `vercel.json` when you want them scheduled.
- **Secret hygiene:** the local `.env` holds real API keys — generate fresh ones for prod and
  never commit a real `.env` (it's gitignored).

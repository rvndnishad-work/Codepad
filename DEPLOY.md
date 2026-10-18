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
- **AI/voice:** `GLM_API_KEY` (+ `AI_INTERVIEW_TOGETHER_MODEL`, `ADMIN_ASSISTANT_MODEL` for the admin assistant), `GEMINI_API_KEY`,
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

## Developer and recruiter domains

One Vercel project serves both sites. The proxy (`src/proxy.ts` with
`src/lib/domains.ts`) looks at the domain of each request:

| Request | What happens |
| :--- | :--- |
| Recruiter page (`/w`, `/pricing`, `/features`, `/take-home`, `/ai-interview`, `/invite`, `/docs`, `/share/screening`, `/purchase`) on the developer domain | Redirect to the same path on the recruiter domain |
| Developer page (`/challenges`, `/interview-questions`, `/playgrounds`, `/blog`, `/c`, `/u`, `/dashboard`, ...) on the recruiter domain | Redirect to the same path on the developer domain |
| `/` on the recruiter domain | Shows the `/hire` page; `/hire` there redirects to `/` |
| `/sitemap.xml`, `/robots.txt` on the recruiter domain | The recruiter sitemap and robots |
| Old domain in `LEGACY_SITE_HOSTS` | Redirect to whichever new domain owns the page; `/api/*` is served as is so webhooks and OAuth callbacks keep working |
| Shared pages (`/login`, `/interview/*`, `/join`, `/admin`, `/api`, legal) | Served on either domain |

Nothing changes until `RECRUITER_SITE_URL` is set. Redirects are 307 until
`DOMAIN_REDIRECTS_PERMANENT=true`. Preview deployments (`*.vercel.app`) and
localhost are never redirected.

**Production env vars**

| Var | Value |
| :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | `https://<developer-domain>` |
| `RECRUITER_SITE_URL` | `https://<recruiter-domain>` |
| `LEGACY_SITE_HOSTS` | the old domain, e.g. `interviewpad.in` (if it is not one of the two) |
| `NEXTAUTH_URL`, `AUTH_URL` | **delete both**. Auth.js rewrites every auth request to that URL, which would send recruiter sign-ins to the developer domain. `AUTH_TRUST_HOST=true` makes it use the domain the visitor is on. |

Sessions are per domain: someone who uses both sites signs in on each.
Recruiter-facing links (invites, take-home, AI screening, interview rooms,
workspace emails) are built on `RECRUITER_SITE_URL`.

**OAuth and integrations:** add `https://<recruiter-domain>/api/auth/callback/google`
(and `/facebook`) next to the developer one. A GitHub OAuth app accepts only one
callback host, so GitHub sign-in on the recruiter domain needs a second GitHub
OAuth app (follow-up). Slack, Google/Microsoft calendar and Stripe return URLs
for workspaces now use the recruiter domain: add those redirect URLs in each
provider. Webhooks can stay on the old domain while it is in `LEGACY_SITE_HOSTS`.

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

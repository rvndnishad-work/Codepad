# Project Setup & Contributor Guide

Local development setup, day-to-day workflows, the collaboration model, and how we keep
production safe. For **deploying to production**, see [`DEPLOY.md`](DEPLOY.md).

---

## Architecture at a glance
- **App:** Next.js 16 (App Router, Turbopack) + Prisma + NextAuth v5.
- **Database:** PostgreSQL. Production = Neon; **local dev = your own Docker Postgres** (never prod).
- **Code execution:** [Piston](https://github.com/engineer-man/piston) runs all untrusted
  candidate code. **Local dev = local Piston in Docker; production = the droplet.** You never
  point local dev at the production droplet (that would require the prod token).

---

## 1. Prerequisites
- **Node.js ≥ 20.9** (Next 16 requirement). `node -v` to check.
- **Docker Desktop** (for local Postgres + Piston).
- **Git**, and an `openssl` (Git Bash on Windows includes it).

---

## 2. First-time setup

### 2.1 Clone & install
```bash
git clone https://github.com/rvndnishad-work/Codepad.git
cd Codepad
npm install
```

### 2.2 Start local infrastructure (Postgres + Piston)
One command brings up both (isolated, local-only):
```bash
docker compose -f docker-compose.dev.yml -f docker-compose.piston.yml up -d
```
- Postgres → `localhost:5432` (db `codepad`, user/pass `postgres`/`postgres`)
- Piston → `localhost:2000`

### 2.3 Create your `.env`
```bash
cp .env.example .env
```
Fill in **local-only** values. Minimum to boot:
```ini
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/codepad"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/codepad"
AUTH_SECRET="<generate>"            # openssl rand -base64 32
AUTH_TRUST_HOST=true
ENCRYPTION_KEY_BASE64="<generate>"  # openssl rand -base64 32
PISTON_URL="http://localhost:2000"
ADMIN_EMAILS="you@example.com"      # the email you'll sign in with for /admin
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```
Generate secrets (no openssl? use Node):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
> 🔒 **Never put production credentials in `.env`.** Local `.env` points only at your local
> Docker Postgres and local Piston. `.env` is gitignored — keep it that way.

### 2.4 Apply the database schema
```bash
npx prisma migrate deploy      # applies committed migrations to your local DB
```
(When you change `schema.prisma` during development, use `npx prisma migrate dev --name <change>`.)

### 2.5 Install Piston language packs (once)
A fresh Piston has zero languages. Install the 7 the judge needs:
```bash
node scripts/piston-install-langs.mjs        # targets localhost:2000 by default
```

### 2.6 Seed content (optional but recommended)
```bash
npx tsx prisma/seed-interview-prep.ts        # multi-language DSA bank (judge content)
# others as needed:
# npx tsx prisma/seed-challenges.ts
# npx tsx prisma/seed-blogs.ts
# npx tsx prisma/seed-prompt-scenarios.ts
# npx tsx prisma/seed-prompt-exemplars.ts
```
Your **admin** account is simply whichever email is in `ADMIN_EMAILS` — sign in with it to reach `/admin`.

### 2.7 Run it
```bash
npm run dev
```
Open http://localhost:3000.

---

## 3. Common tasks
| Task | Command |
|---|---|
| Start/stop local infra | `docker compose -f docker-compose.dev.yml -f docker-compose.piston.yml up -d` / `down` |
| New migration (dev) | `npx prisma migrate dev --name <change>` |
| Apply migrations | `npx prisma migrate deploy` |
| Regenerate Prisma client | `npx prisma generate` |
| Reset local DB (destructive) | `npx prisma migrate reset` |
| Inspect DB | `npx prisma studio` |
| Re-install Piston langs | `node scripts/piston-install-langs.mjs` |
| Lint | `npm run lint` |

> If Prisma generate fails on Windows with `EPERM`, stop the dev server first (it locks the
> engine DLL), then re-run.

---

## 4. Collaboration workflow
1. Branch off `develop`: `git checkout -b feat/my-thing`.
2. Commit; push; open a **PR into `develop`**.
3. Vercel builds a **Preview deployment** automatically (uses the Preview environment + a
   non-prod database — see §5). Test there.
4. Owner reviews (CODEOWNERS enforces review on sensitive paths) and merges.
5. Production deploys only when the **production branch** (`main`/`master`) is updated by the
   owner — never on a feature branch.

---

## 5. Environments & database safety
Three isolated lanes — **no developer can reach production data**:

| Lane | Database | Code-exec | Who holds the credentials |
|---|---|---|---|
| **Production** | Neon **prod branch** | Droplet Piston | **Only Vercel Production** (Sensitive env vars). No human, no repo. |
| **Preview** (PRs) | Neon **preview branch** | (mock/none or a staging Piston) | Vercel Preview env. |
| **Local dev** | your **Docker Postgres** | local Docker Piston | the developer (throwaway, local). |

How this stays safe:
- **Prod DB string lives only in Vercel Production**, as a *Sensitive* variable (write-only —
  not even project members can read it back). Migrations run in the Vercel **build**
  (`prisma migrate deploy`), so no human ever needs the prod credential.
- **`.env` is gitignored**; `.env.example` holds placeholders only. No secret ever enters Git.
- **Preview must point at a non-prod DB.** Enable Neon's per-preview branch in the Vercel↔Neon
  integration so PR deploys can't touch prod.
- **Local Piston, not the droplet** — devs never get the prod `PISTON_AUTH_TOKEN`.

**Never:** put a prod connection string in `.env`/Slack/`.env.example`; point Preview at the
prod branch; share the Neon prod-branch or Piston token with a developer.

---

## 6. Safeguarding the code & infra — checklist

### GitHub (do these in repo settings)
- [ ] **Branch protection** on `main`/`master` (and `develop`): require PR, ≥1 approving
      review, **require review from Code Owners**, no force-push, no direct push, require the
      **CI** check (`.github/workflows/ci.yml`) to pass, require branch up-to-date.
- [ ] **Secret scanning + push protection** ON (Settings → Code security) — blocks committing
      tokens/keys. Free for public repos and most private repos.
- [ ] **Dependabot** alerts + security updates ON (catches vulnerable deps, like the Next CVE).
- [ ] **Require 2FA** for all collaborators.
- [ ] `CODEOWNERS` (already added) gates sensitive paths: auth, prisma, deploy, env, MCP, TOTP.

### Secrets & access
- [ ] Production secrets live **only** in Vercel Production (Sensitive). Nowhere else.
- [ ] **Least privilege:** you are sole owner of the Vercel project + Neon project +
      DigitalOcean. Collaborators are GitHub members only; they don't need Neon/DO accounts.
- [ ] **Rotate shared secrets** (`PISTON_AUTH_TOKEN`, `AUTH_SECRET`, `CRON_SECRET`) before
      launch and **whenever a collaborator leaves**. (Rotate Piston: update the droplet
      `/opt/piston/.env` → `docker compose ... up -d --force-recreate caddy`, and the Vercel var.)
- [ ] 2FA on every account: GitHub, Vercel, Neon, DigitalOcean.

### Database
- [ ] **Neon backups / point-in-time restore** verified on the prod branch.
- [ ] Preview/local never share the prod database.

### Droplet (Piston)
- [ ] **DO Cloud Firewall:** inbound 80 + 443 from anywhere, **22 from your IP only**; deny the
      rest. (Piston's `2000` is unpublished, so it's never directly reachable.)
- [ ] SSH **key-only** login (no passwords); enable `unattended-upgrades`.
- [ ] Keep Piston behind the Caddy bearer proxy (already configured) — never expose `2000`.

### Already in the app (keep enabled)
- Distributed rate limiting via Upstash (set `UPSTASH_REDIS_REST_*` in prod).
- Encryption at rest for TOTP/MCP tokens (`ENCRYPTION_KEY_BASE64` — set once, never rotate
  casually or you invalidate stored ciphertext).
- Audit logs, user 2FA (TOTP), admin-route gating via `ADMIN_EMAILS`.

---

## 7. Deploying to production
See [`DEPLOY.md`](DEPLOY.md) — provisioning Neon + Vercel env vars + the droplet Piston, and the
post-deploy smoke test. Production deploys are owner-only via the production branch.

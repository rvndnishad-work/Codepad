# Codepad

Browser-based JavaScript playground. JS/TS/React/Vue/Angular/Svelte/SolidJS plus
React ecosystem starters (Redux Toolkit, MobX, Framer Motion, Material UI).

All execution happens **client-side** in Sandpack's sandboxed iframe — zero
server execution cost, strong isolation (`sandbox="allow-scripts"`).

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- Sandpack (CodeSandbox's in-browser bundler)
- Prisma + SQLite (swap to Postgres via `DATABASE_URL`)
- Auth.js v5 with GitHub OAuth (optional)
- Tailwind CSS

## Quick start

```bash
cp .env.example .env
npm install
npm run db:push
npm run dev
```

Open <http://localhost:3000>.

### Enable sign-in (optional for save)

Create a GitHub OAuth app (`http://localhost:3000/api/auth/callback/github`),
then set:

```
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
AUTH_SECRET=$(openssl rand -base64 32)
```

## Scripts

- `npm run dev` — Next dev server on :3000
- `npm run build` — production build
- `npm run db:push` — apply Prisma schema to SQLite
- `npm run db:studio` — open Prisma Studio

## How execution is isolated

Sandpack compiles user code entirely in the browser and runs the result inside
an iframe served from a separate origin (`sandpack-bundler`). The iframe uses
`sandbox="allow-scripts"` and cannot reach the parent app, cookies, or origin
storage. No user code touches your server.

## Next steps

- Public snippet sharing (`visibility: public`)
- Fork from saved snippets
- Monaco editor swap (heavier but full LSP)
- Rate-limit middleware for API routes
- Embed mode (`/embed/[slug]`)

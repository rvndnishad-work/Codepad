# Cron-based notification triggers (IP-46)

Time-based notifications fire from `/api/cron/notifications/*` endpoints. Each
endpoint is idempotent (re-running is safe, dedup is built in) and guarded by
a shared `CRON_SECRET` header.

## Endpoints

| Route | Recommended cadence | What it does |
|---|---|---|
| `POST /api/cron/notifications/take-home-expiring` | every 15 min | Scans `PENDING`/`ACTIVE` take-homes expiring within 24h. Notifies the candidate (if known) + workspace admins. Dedup per `(recipient, takeHomeId)`. |
| `POST /api/cron/notifications/stale-scorecards` | every 2 hours | Scans live interview sessions completed > 1h ago with no rubric. Notifies the session owner. Dedup per `sessionId`. |
| `POST /api/cron/notifications/ai-credits-sweep` | every 1 hour | Scans GROWTH/ENTERPRISE workspaces with balance ≤ 5 sessions. Notifies workspace admins. Dedup per workspace per 24h. |

`GET` is also accepted on each route (same auth, same behavior) for easy
curl-from-CLI testing in dev.

## Auth

Every request must carry the secret in one of two headers:

```http
X-Cron-Secret: <CRON_SECRET>
# or, Vercel Cron / OAuth-style:
Authorization: Bearer <CRON_SECRET>
```

The check uses `crypto.timingSafeEqual` so a wrong secret can't be probed via
response-timing side channel.

Generate the secret once and store in env:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# add to .env:  CRON_SECRET=<output>
```

## Scheduler setup

Pick one based on deploy target. **This is intentionally not committed** —
the choice depends on where the app runs. Tracked as **IP-63** in
`/admin/todos`.

### Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/notifications/take-home-expiring", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/notifications/stale-scorecards",   "schedule": "0 */2 * * *" },
    { "path": "/api/cron/notifications/ai-credits-sweep",    "schedule": "0 * * * *" }
  ]
}
```

Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when the env
var is named `CRON_SECRET` — no extra config needed.

### GitHub Actions

`.github/workflows/cron-notifications.yml`:

```yaml
name: Notification crons
on:
  schedule:
    - cron: "*/15 * * * *"  # take-home expiring
    - cron: "0 */2 * * *"   # stale scorecards
    - cron: "0 * * * *"     # ai credits sweep
jobs:
  fire:
    runs-on: ubuntu-latest
    steps:
      - name: take-home-expiring
        if: github.event.schedule == '*/15 * * * *'
        run: curl -sf -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}" "${{ secrets.APP_URL }}/api/cron/notifications/take-home-expiring"
      - name: stale-scorecards
        if: github.event.schedule == '0 */2 * * *'
        run: curl -sf -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}" "${{ secrets.APP_URL }}/api/cron/notifications/stale-scorecards"
      - name: ai-credits-sweep
        if: github.event.schedule == '0 * * * *'
        run: curl -sf -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}" "${{ secrets.APP_URL }}/api/cron/notifications/ai-credits-sweep"
```

## Manual invocation (dev)

```bash
export CRON_SECRET=$(grep '^CRON_SECRET=' .env | cut -d= -f2)
curl -sf -H "X-Cron-Secret: $CRON_SECRET" \
  http://localhost:3000/api/cron/notifications/take-home-expiring | jq
```

Response shape:

```json
{
  "ok": true,
  "task": "take-home-expiring",
  "scanned": 12,
  "notificationsCreated": 8,
  "horizon": "2026-05-30T03:06:40.532Z"
}
```

## Operational notes

- **Failure handling**: today, a per-row failure is logged with `[notify]`
  prefix and the loop continues. Tracked retry-queue work is **IP-65**.
- **Observability**: there's no admin "cron health" panel yet (last-run /
  errors). Tracked as **IP-64**.
- **Dedup**: every helper checks for existing notifications before creating.
  Re-running a cron tick is always safe.
- **Performance**: each handler caps at 200 rows per scan to avoid runaway
  fan-out during catch-up after an outage.

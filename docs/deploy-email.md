# Email deliverability — production deploy checklist (IP-24 AC #3)

This is the DNS + Resend setup required before mail from Interviewpad lands in
inboxes (not spam) at Gmail, Outlook, Apple Mail, etc. Without SPF + DKIM
configured, Gmail will route every send to spam regardless of content.

The transactional adapter (`src/lib/email.ts`) is already wired and verified
in **test mode** for local dev. This doc covers the *production* hardening.

## TL;DR

1. Pick a transactional subdomain (recommended `mail.interviewpad.in`).
2. Verify it in Resend → it emits **DKIM** + **SPF** CNAME/TXT records to add.
3. Add those records at your DNS provider; wait for Resend to mark verified.
4. Add a **DMARC** TXT record on the parent domain.
5. Set `EMAIL_FROM` in production env to `noreply@mail.interviewpad.in` (or similar).
6. Send a test → use [mail-tester.com](https://www.mail-tester.com/) to grade.

## Why a subdomain

Sending transactional mail from `mail.interviewpad.in` (not `interviewpad.in`)
isolates your main-domain reputation from any deliverability issues on this
surface. Marketing campaigns later should use a *third* subdomain (e.g.
`news.interviewpad.in`) so a campaign send-rate spike never poisons
transactional delivery.

## 1 — Verify the domain in Resend

1. Resend dashboard → **Domains** → **Add Domain**.
2. Enter `mail.interviewpad.in`.
3. Resend emits ~4 records:
   - **DKIM** — usually a CNAME like `resend._domainkey.mail.interviewpad.in` → `<resend host>` (proves Resend may sign mail from your domain).
   - **SPF** — a TXT like `v=spf1 include:_spf.resend.com ~all` (declares Resend is allowed to send for the domain). Add to `mail.interviewpad.in`.
   - Optional **Return-Path** CNAME for bounce handling.

Copy these into the DNS provider exactly as Resend gives them.

## 2 — Add records at your DNS provider

Cloudflare / Route53 / Namecheap / etc. Common gotchas:

- DKIM CNAME values often include a trailing dot — keep it.
- If your DNS UI shows the host field "as fragment" (e.g. `resend._domainkey`), do NOT include the apex domain again — it'll double up.
- TTL: 3600 is fine.
- Cloudflare orange-cloud proxy must be **off** on these records (proxying breaks TXT/CNAME for email auth).

After adding, return to Resend → **Verify**. May take a few minutes.

## 3 — DMARC

DMARC tells receivers what to do when SPF / DKIM fail and where to send
aggregate reports. Add ONE TXT record on the *organizational* domain
(`interviewpad.in`, not the subdomain).

**Host:** `_dmarc.interviewpad.in`
**Type:** TXT
**Value (start with monitor-only):**

```
v=DMARC1; p=none; rua=mailto:dmarc@interviewpad.in; pct=100; aspf=r; adkim=r
```

- `p=none` → "observe but don't act" — safest starting point. Once your
  weekly DMARC reports show 100% SPF+DKIM aligned for >2 weeks, ratchet to
  `p=quarantine`, then later `p=reject`.
- `rua=` → mailbox that receives daily aggregate reports. Set up forwarding
  to a real inbox or to a service like Postmark DMARC / dmarcian.

## 4 — Production env

Add to your prod environment (Vercel / wherever):

```
RESEND_API_KEY=re_live_…              # NOT your dev key
EMAIL_FROM="Interviewpad <noreply@mail.interviewpad.in>"
```

`src/lib/email.ts` defaults `EMAIL_FROM` to the test sender (`onboarding@resend.dev`)
outside production — so the dev/test/prod split is automatic once `NODE_ENV=production`.

## 5 — Smoke test on prod

Pick a recipient you control (NOT a Gmail-to-Gmail loopback — those hide spam
routing). Trigger a real send (e.g. the AI screening invite from a real
candidate row). Then:

- Check the recipient inbox → confirm it lands in **Inbox**, not Spam.
- View source → headers should show:
  - `Authentication-Results: ... spf=pass ... dkim=pass ... dmarc=pass`
  - `From:` matches `EMAIL_FROM`.
- Run a one-off through [mail-tester.com](https://www.mail-tester.com/) —
  aim for 9/10+. Common deductions are missing DMARC, missing list-unsubscribe
  (only relevant for marketing/bulk), or missing reverse DNS (Resend's own).

## 6 — Ongoing monitoring

- DMARC reports → spot misconfigured sub-systems sending unsigned mail.
- Resend dashboard → bounce rate, complaint rate. >2% bounce or >0.1% complaint = investigate.
- Periodically resend mail-tester through the prod template path (e.g. monthly).

## Coupled tickets

- **IP-25** — EmailLog model + Resend webhook + suppression list. Webhook
  receives delivered/bounced/complained events; we persist them and skip
  future sends to suppression-listed addresses.
- **IP-66** — wire email channel for notification preferences.

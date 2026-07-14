# Creator Marketplace — Stripe End-to-End Test Checklist

The creator-space payment engine (Stripe Connect destination charges) has full
unit coverage but needs one live pass against Stripe **test mode** before real
money flows. This is the runbook.

## Prereqs

1. **Env** (`.env`):
   - `STRIPE_SECRET_KEY=sk_test_…` (platform account, test mode)
   - `STRIPE_WEBHOOK_SECRET=whsec_…` (from step 3)
2. **Stripe CLI** logged into the platform account: `stripe login`
3. **Webhook tunnel** while `npm run dev` is running:
   ```
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Copy the printed `whsec_…` into `STRIPE_WEBHOOK_SECRET` and restart dev.
   Events the route consumes: `checkout.session.completed`,
   `customer.subscription.updated/deleted`, `invoice.paid`, `account.updated`.

## Pass 1 — Connect onboarding

- [ ] Studio → Overview → **Start onboarding** (`/creator/<handle>`)
- [ ] Complete the Express flow with test data (any future date, SSN `000-00-0000`, routing `110000000` / account `000123456789`)
- [ ] Back in the studio, the payouts banner disappears → `CreatorAccount.chargesEnabled=true`
      (arrives via the `account.updated` webhook — check the tunnel log)

## Pass 2 — Membership subscription

- [ ] As a second (buyer) test user, open `/c/<handle>` → subscribe to a tier
      with card `4242 4242 4242 4242`
- [ ] `checkout.session.completed` (kind `SPACE_MEMBERSHIP`) in the tunnel log
- [ ] `SpaceMembership` row `active`; buyer sees the "member" chip on the space page
- [ ] Gated content at that tier now opens for the buyer (no paywall)
- [ ] `CreatorEarning` row exists (sourceKind `TIER`) with an 80/20 split
- [ ] Stripe dashboard (test): destination charge on the connected account with application fee

## Pass 3 — Renewal earnings (`invoice.paid`)

- [ ] Advance the subscription: Stripe dashboard → the test clock, or
      `stripe trigger invoice.paid` (attaches a synthetic invoice)
- [ ] Tunnel log shows `MEMBERSHIP_RENEWAL … earning recorded`
- [ ] Second `CreatorEarning` row appears; totals on `/creator/<handle>/payment` grow
- [ ] Redeliver the same event (`stripe events resend <id>`) → log says
      "already recorded", **no duplicate row** (idempotent on charge id)

## Pass 4 — One-time content purchase

- [ ] Set a `$` price on one content item (editor publish panel or content library)
- [ ] As the buyer, buy it from the space page
- [ ] `checkout.session.completed` (kind `CONTENT_PURCHASE`) → `Entitlement` row
- [ ] Content opens for the buyer; `CreatorEarning` (sourceKind `CONTENT`) recorded

## Pass 5 — Cancellation

- [ ] Cancel the subscription in the Stripe dashboard
- [ ] `customer.subscription.deleted` → membership `status=canceled`
- [ ] Tier-gated content is paywalled again for the ex-member
      (one-time purchases keep their entitlement — permanent by design)

## Known non-blockers

- Comp memberships (`comp_…` subscription ids) never hit Stripe — the webhook
  can't touch them because their ids can't collide with real subscription ids.
- The `demo-studio` seed uses `demo_…` ids for the same reason.

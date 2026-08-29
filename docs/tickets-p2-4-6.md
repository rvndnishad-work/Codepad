# P2 Tickets — Ready for Dev & Testing (4–6)

> Moat (6 months) — builds on `feat/creator-v2-stage-8` + `P0 1-3` + `P1 1-3`. Each ticket is AAA-ready: file refs `file:line`, prisma diff, Zod, API, trendy `glass/aurora/bento` specs, E2E `file:line`.

---

## TICKET 4 — P2: Multi-Space Teams + Custom Domains — one creator, many storefronts

**Status:** Ready | **Epic:** Creator Scale | **Priority:** P2 | **Estimate:** 7d (3 BE + 2 FE + 2 infra) | **Base:** `feat/p1-t3-discovery`

### Problem
`CreatorSpace` `prisma/schema.prisma:1588` is `v1: one space per creator` (`CREATE UNIQUE INDEX CreatorSpace_ownerId_key` `migrations/20260611092228:151`). DB now has **no** unique index (`pg_indexes` shows only `handle_key`), but schema still says one, and `seed-creator-space.ts:127` wipes `winordie` for `rvndnishad` to dodge `P2002`. Creators cannot run `Design Systems` + `JS Interview` as separate brands, cannot invite co-authors, cannot map `design.interviewpad.in`.

### Solution
Drop the unique, add `SpaceMember` + `SpaceDomain`.

### Scope
- **DB Migration `2026xxxx_multi_space`:**
  ```sql
  DROP INDEX IF EXISTS "CreatorSpace_ownerId_key";
  CREATE INDEX "CreatorSpace_ownerId_idx" ON "CreatorSpace"("ownerId");
  CREATE TABLE "SpaceMember" (
    id TEXT PRIMARY KEY, spaceId TEXT NOT NULL REFERENCES "CreatorSpace"(id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('OWNER','ADMIN','EDITOR','VIEWER')),
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(spaceId, userId)
  );
  CREATE TABLE "SpaceDomain" (
    id TEXT PRIMARY KEY, spaceId TEXT NOT NULL REFERENCES "CreatorSpace"(id) ON DELETE CASCADE,
    hostname TEXT NOT NULL UNIQUE, verifiedAt TIMESTAMP, createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  ```
  Prisma: `model SpaceMember + SpaceDomain`, `CreatorSpace.members/domains`, `ownerId` stays FK not unique, `@@index([ownerId])`.
- **Domain:** `src/lib/creator/teams.ts` `can(spaceId, userId, "space:edit|publish|members|domain")` helper; extend `requireMySpace` `src/app/creator/actions.ts:32` → `requireSpaceAccess` (owner OR member `ADMIN/EDITOR`).
- **BE:** `src/app/creator/actions.ts` add `addSpaceMemberAction/inviteSpaceMemberAction/removeSpaceMemberAction`, `verifySpaceDomainAction` (TXT `interviewpad-verify=spaceId`), `revalidateTag('space:handle')` + `SpaceVersion` audit.
- **FE Studio:** `src/app/creator/[handle]/settings/SettingsClient.tsx:31` add `Team` section (email+role select → invite, pending `WorkspaceInvite:800` pattern but `SpaceInvite`), `Domains` section (add hostname → verify flow). `CreatorSidebar.tsx:78` `spaces` already `Your Pages` switcher — keep, now shows many per owner.
- **FE Public:** `src/middleware.ts` / `next.config.ts:22` `images.remotePatterns` already — add `host` matcher for `SpaceDomain` to route `design.example.com` → `c/[handle]`.

### Acceptance Criteria
- [ ] `rvndnishad` can own `winordie` + `demo-studio` + new `design-systems` without `P2002`; `SELECT handle FROM CreatorSpace WHERE ownerId='...'` returns 3.
- [ ] `ADITOR` can edit blocks (`updateSpaceBlocksAction`) but not delete space; `VIEWER` read-only.
- [ ] Custom domain `design.example.com` TXT verified → `https://design.example.com/c/design-systems` resolves via middleware.
- [ ] Invite email via `EmailLog:206` + `SiteSetting` flag not needed.

### Design (trendy)
- Team `rounded-[1.5rem] border bg-surface` `bento` avatars `w-8 h-8 rounded-full border-2 border-bg shadow`, role pills `rounded-full bg-panel border`, glass invite modal `backdrop-blur-xl`.

### Tests
- **Unit:** `tests/unit/creator-teams.test.ts` — `can()` matrix, domain verify regex.
- **E2E:** `tests/e2e/creator-teams.spec.ts` — chromium: owner invites editor → editor edits design → viewer cannot.
- **Gate:** `npx tsc --noEmit; npx prisma validate; npm run test:unit -- -t creator-teams; playwright creator-teams` → `stage-team.json`.

---

## TICKET 5 — P2: Metered + Gift + Team Licensing — beyond `PURCHASE/GRANT`

**Status:** Ready | **Epic:** Monetization | **Priority:** P2 | **Estimate:** 6d (2 BE + 2 FE + 1 Stripe + 1 QA)

### Problem
`Entitlement:1670` only `PURCHASE|GRANT`, `SpaceContent` `previewLines/seo` `prisma:2062` but no `gift` (shareable) nor `team` (5-seat) nor `metered` (3 free/month). Creators lose gifting viral loop and team buyers.

### Solution
Add `GiftEntitlement` + `TeamLicense` on top of `Entitlement`; keep `StripeConnect` `CreatorAccount:1570`.

### Scope
- **DB Migration `2026xxxx_licensing`:**
  ```sql
  CREATE TABLE "GiftEntitlement" (
    id TEXT PRIMARY KEY, giverId TEXT, recipientEmail TEXT NOT NULL,
    contentType TEXT NOT NULL, contentId TEXT NOT NULL, spaceContentId TEXT,
    code TEXT NOT NULL UNIQUE, claimedById TEXT, claimedAt TIMESTAMP,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE "TeamLicense" (
    id TEXT PRIMARY KEY, buyerId TEXT NOT NULL, spaceId TEXT NOT NULL REFERENCES "CreatorSpace"(id),
    tierRank INT NOT NULL, seats INT NOT NULL CHECK (seats BETWEEN 2 AND 100),
    stripeCheckoutId TEXT UNIQUE, createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  ALTER TABLE "Entitlement" ADD COLUMN "giftId" TEXT REFERENCES "GiftEntitlement"(id);
  ALTER TABLE "SpaceContent" ADD COLUMN "meteredFree" INT DEFAULT 0; -- 0=off, else N free views/month
  ```
  Prisma: `GiftEntitlement`, `TeamLicense`, `Entitlement.giftId`, `SpaceContent.meteredFree`.
- **Domain:** `src/lib/marketplace/gifts.ts` `createGiftCode({giverId, contentType, contentId, recipientEmail}) → code` (nanoid 12), `claimGift(code, claimerId)` idempotent on `claimedAt`; `src/lib/marketplace/teams.ts` `createTeamLicense`; `src/lib/marketplace/metered.ts` `checkMetered(userId, contentId)` via `SpaceEvent:1628` count `where kind=CONTENT_VIEW and createdAt gte monthStart`.
- **BE:** `src/app/creator/actions.ts` add `createGiftAction` (validates `getContentOwnerId`), `claimGiftAction`, `createTeamCheckoutAction` (Stripe `quantity: seats`), `createMeteredViewAction`; extend `hasAccess: ` `src/lib/marketplace/access.ts` to check `Entitlement` OR `GiftEntitlement.claimedById` OR `TeamLicense` member list OR `meteredFree` window.
- **FE Studio:** `src/app/creator/[handle]/content/ContentClient.tsx:227` row add `Gift` button (email → code) + `Team` (seats select) + `Metered` `free N` input (0–5) alongside `previewLines`.
- **FE Public:** `BuyContentButton` offer `Gift this` → email form → code, `SpacePaywall.tsx:5` show `Gift code` input + `Team join` CTA, `SpaceFeed` `TypeTag` keeps `FREE/Un-locked/tierName` `SpaceFeed.tsx:298` plus `Gift` pill.
- **Webhooks:** `src/app/api/webhooks/stripe/route.ts` handle `checkout.session.completed` `kind=TEAM_LICENSE` → create `TeamLicense`.

### Acceptance Criteria
- [ ] `POST /api/gifts` with `demo-fan1` as giver for `TUTORIAL demo-why...` → `code ABC12` → anon redeems → `Entitlement` with `giftId` + `claim` → full view bypass paywall.
- [ ] Studio sets `meteredFree=3` on `InterviewQA` → anon 3 views (via `SpaceEvent`) see full, 4th shows paywall `Preview 3 lines`.
- [ ] Team buyer `5 seats` → 5 distinct `subscriberId` share `tierRank` via `TeamLicense` → `hasAccess` true for all seats, `Stripe` quantity 5.
- [ ] Second webhook `stripeChargeId` duplicate → `CreatorEarning:1721` unique no duplicate.

### Design (trendy)
- Gift modal `rounded-[1.5rem] border bg-surface backdrop-blur` with `Gift` `w-10 h-10 rounded-full bg-[#FFE600]`, code `font-mono bg-panel border-dashed`, clay pills `rounded-full bg-panel`.

### Tests
- **Unit:** `tests/unit/gifts.test.ts` — create/claim idempotent, metered window 3/4, team seats 5.
- **E2E:** `tests/e2e/gifts.spec.ts` — chromium: giver creates gift → recipient claims → full view; metered 3→paywall; team 5 seats.
- **Gate:** `verify-stage -Stage 5` extended (marketplace `gifts`).

---

## TICKET 6 — P2: Live Interview v2 — Collaborative Replay + Recording + AI Notes + Integrity Badge

**Status:** Ready | **Epic:** Hiring | **Priority:** P2 | **Estimate:** 8d (3 BE + 3 FE + 2 AI)

### Problem
Live `InterviewSession` `prisma:554` `y-webrtc` `package.json:123` + `y-codemirror.next` `src/components/CollaborativePlayground.tsx` works but no recording, no AI notes, integrity split `CandidateIntegrityReport:939` (blur/paste) vs `ProctorAgentReport:965` (overlay) never merged. Recruiters replay blind.

### Solution
Unify integrity + add recording/notes to replay.

### Scope
- **DB:** No migration needed (reuse `InterviewSession`, `ProctorAgentReport`, `CandidateIntegrityReport`, `SessionEventLog:931`).
- **Domain:** Reuse `src/lib/integrity/score.ts:12` `computeIntegrityScore` (already `feat/p1-t2-bulk-hiring: a733c88`) — already merges browser+proctor. Extend to emit `reasons[]` for badge tooltip.
- **BE:** `src/app/admin/attempts/[id]/replay/page.tsx` loader joins `Attempt → Session → IntegrityReports`; API `POST /api/sessions/[id]/notes` (Gemini `ADMIN_HELPER` `AgentConfig:2077`) to generate `aiNotes` from `chatHistory`.
- **FE:** `src/app/admin/attempts/[id]/replay/ReplayPlayerClient.tsx` — add `IntegrityBadge` `level clean/low/medium/high` `LEVEL_STYLES` `score.ts:30` top-bar, `recording` video `LiveKit` `LIVEKIT_API_KEY:82` player, `AI Notes` drawer `ProseMirror` style `globals.css:422`, `Rubric` `InterviewRubric:951` fill from transcript.
  - `CollaborativePlayground.tsx` add `recording` flag `LiveKit` track.
- **UX:** Existing `ReplayPlayerClient` already `yjs` cursor — add timeline scrub `range` with `integrity` heat overlay.

### Acceptance Criteria
- [ ] Replay `GET /admin/attempts/[id]/replay` shows `IntegrityBadge: 42 Medium` with tooltip `reasons` + `recording` player + `AI Notes` (generated) + `Rubric` prefilled.
- [ ] Live: 2 peers `y-webrtc` `signalingUrl` collaborate, blurs/pastes counted `CandidateIntegrityReport` + proctor `suspicionScore` → `IntegrityScore` updates live.
- [ ] `prefers-reduced-motion` disables scrub animation, `axe` 0 critical.

### Design (trendy)
- Replay `bento 12-col` `rounded-[1.5rem] border bg-surface` `shadow 0_16_40`, timeline `h-1.5 rounded-full bg-panel` `accent` fill, badge `rounded-full border backdrop-blur` `clean=emerald/low=amber/medium=orange/high=rose`.

### Tests
- **Unit:** `tests/unit/integrity.test.ts` — already `computeIntegrityScore` 5 cases (blur>3, paste>1, reports>10).
- **E2E:** `tests/e2e/replay.spec.ts` — chromium: start session → blur 4× paste 2× → `IntegrityScore` medium → replay shows badge + recording.
- **Gate:** `verify-stage` with `playwright replay --project=chromium` + `axe`.

---

## How to cut & verify each P2 ticket (isolated)

```powershell
git checkout -b feat/p2-t4-multispace feat/p1-t3-discovery
# implement ticket 4
npx tsc --noEmit; npx eslint src/lib/creator src/app/creator --ext .ts,.tsx --cache --max-warnings 0
npm run test:unit -- -t creator-teams; npx playwright test --project=chromium tests/e2e/creator-teams.spec.ts
.\scripts\verify-stage.ps1 -Stage 4 -SkipE2E # or custom stage-team
```
Repeat for `feat/p2-t5-gifts` (`-Stage 5`) and `feat/p2-t6-live` (`replay`).

**Order:** 4 → 5 → 6 (domains unblock teams, gifts unblock viral, live needs integrity lib already on `feat/p1-t2-bulk-hiring`).

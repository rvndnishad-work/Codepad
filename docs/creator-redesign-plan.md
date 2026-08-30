# Creator Space — Full Redesign Implementation Plan

**Scope:** public creator pages (`/c/[handle]`), creator studio (`/creator/*`), admin creator management (`/admin/creators`), and the supporting data model.
**Current audit base:** `src/app/c/[handle]/page.tsx:88`, `src/lib/creator/layout.ts:1`, `prisma/schema.prisma:1588`, `src/app/admin/creators/page.tsx:13`, `src/app/app/creator/[handle]/CreatorSidebar.tsx:78`.
**Principles:** creator = publisher with storefront; every change is `customization × performance × trust`; no big-bang — additive migrations + feature flag `creator_v2` (`SiteSetting` table).

---

## 0. Conventions & Flag

- Flag storage: `SiteSetting { key: "creator_v2", value: "off|10|50|100" }` — read server-side; client hydration never decides.
- Keep `CreatorSpace.layout` column and `normalizeLayout()` `src/lib/creator/layout.ts:73` as fallback for 2 releases.
- Branching: `feat/creator-v2-stage-N` off `develop`; squash merge after gate passes.
- Each stage ends at a **Verification Gate** — do not start N+1 until gate N is green.

---

## Stage 0 — Baseline & Instrumentation (2d) — blocks Stage 1

### Goal
Freeze pre-redesign metrics so improvements are provable.

### Tasks
1. Run baseline Lighthouse on `/c/[handle]` (published demo space), `/creators`, `/become-creator`. Record LCP/CLS/TBT, bundle size (`next build` analyze).
2. Record DB baselines: `SELECT count(*) FROM "CreatorSpace"`, `"SpaceContent"`, `"SpaceFollow"`, `"SpaceEvent"`.
3. Confirm `prisma/schema.prisma:SiteSetting` exists; add flag reader helper `src/lib/creator/flag.ts`.
4. Add aggregation helper on `src/lib/creator/events.ts` if missing (`COUNT WHERE createdAt >= now()-30d`).

### Output artifacts
- `docs/evidence/baseline-lighthouse.json`
- `docs/evidence/baseline-db.json`

### Verification Gate 0
```powershell
npm run build
npx tsc --noEmit
npm run test:unit
npx playwright test --project=chromium tests/e2e/auth.spec.ts
# manual: Lighthouse CLI
npx lighthouse http://localhost:3000/c/demo --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=docs/evidence/baseline-lighthouse.json
psql $env:DATABASE_URL -c "SELECT count(*) FROM \"CreatorSpace\";"
```
**Pass criteria:** build green, `tsc` 0 errors, unit green, Lighthouse JSON written, DB counts logged.

---

## Stage 1 — Data Model: Blocks Engine (4d)

### Goal
Introduce `blocks` doc without breaking reads. This unblocks all customization work.

### Tasks
1. **Migration** — additive only, no column drop:
   ```prisma
   // prisma/schema.prisma:CreatorSpace
   blocks   Json?      // SpaceBlocksDoc
   styles   Json?      // TokenSet
   // new
   model SpaceVersion {
     id        String   @id @default(cuid())
     spaceId   String
     blocks    Json
     styles    Json?
     actorId   String?
     publishedAt DateTime @default(now())
     space     CreatorSpace @relation(fields: [spaceId], references: [id], onDelete: Cascade)
     @@index([spaceId, publishedAt])
   }
   ```
   Run `npx prisma migrate dev --name add-blocks-doc`.
2. **Library** — new `src/lib/creator/blocks.ts`:
   - `type BlockType = SectionKey | "HERO" | "CTA" | "GALLERY" | "FAQ" | "TESTIMONIAL" | "NEWSLETTER" | "EMBED"`
   - `type Block = { id:string; type:BlockType; props:Record<string,unknown>; cols:number; visible:boolean; tierGate?:number|null }`
   - `type SpaceBlocksDoc = { hero: HeroProps; blocks: Block[] }`
   - `function normalizeBlocks(raw: unknown, legacy: unknown): SpaceBlocksDoc` — migrates `layout` → `blocks` when `blocks` is null. Drops unknown keys, dedupes, appends missing `SECTION_KEYS` `src/lib/creator/layout.ts:8`.
   - Zod validators `blockSchema`, `blocksDocSchema`.
3. **Reader patch** — `src/app/c/[handle]/page.tsx:94` try `blocks` first, fallback to `normalizeLayout`.
4. **Backfill** — `scripts/migrate-layout-to-blocks.ts` idempotent bulk update (DRY_RUN flag).

### Files touched
`prisma/schema.prisma`, `src/lib/creator/blocks.ts` (new), `src/lib/creator/layout.ts`, `src/app/c/[handle]/page.tsx`, `scripts/migrate-layout-to-blocks.ts`.

### Verification Gate 1
```powershell
npx prisma migrate dev --name add-blocks-doc
npx prisma generate
npx tsx scripts/migrate-layout-to-blocks.ts --dry-run
npx tsx scripts/migrate-layout-to-blocks.ts
# second run must be no-op
npx tsx scripts/migrate-layout-to-blocks.ts --dry-run
npm run test:unit  # must include tests/unit/blocks.test.ts: normalizeBlocks covers legacy→blocks, dedupe, missing keys
npx tsc --noEmit
psql $env:DATABASE_URL -c "SELECT handle, layout IS NOT NULL AS has_layout, blocks IS NOT NULL AS has_blocks FROM \"CreatorSpace\" LIMIT 5"
# manual: open /c/[handle] — identical render via fallback; open /creator/[handle]/layout — no regression
.\scripts\verify-stage.ps1 -Stage 1
```
**Pass:** migration applies, `generate` OK, backfill idempotent, unit tests green, public page unchanged.

---

## Stage 2 — Design System & Tokens (3d)

### Goal
Replace 4-string `Theme` `src/lib/creator/layout.ts:23` with a proper token set; visual presets become sellable.

### Tasks
1. `src/app/globals.css` extract CSS vars into token map. New `src/lib/creator/tokens.ts`:
   ```ts
   export type TokenSet = { accent:string; radius:number; font:{heading:string;body:string;mono:string}; density:"compact"|"cozy"; card:"soft"|"outlined"|"ghost"; surface:"solid"|"glass" }
   export const TOKEN_PRESETS: Record<string, TokenSet> = { slate, glassmorphism, neon, minimalist, editorial, paper, midnight, aurora }
   ```
2. Preset picker `src/components/creator/TokenPicker.tsx` — 8 cards with live swatch, contrast badge (WCAG AA check in picker).
3. Inject `style` vars on `page.tsx:324` root `<div style={cssVars(styles)}>`; keep class `theme-${theme}` shim for 1 release.
4. Studio hook in `LayoutClient.tsx:68` or new `DesignClient`.

### Files touched
`src/app/globals.css`, `src/lib/creator/tokens.ts` (new), `src/components/creator/TokenPicker.tsx` (new), `src/app/c/[handle]/page.tsx`.

### Verification Gate 2
```powershell
npx tsc --noEmit
npm run test:unit  # tokens.test.ts: preset contrast >=4.5:1, cssVars serializes correctly
# manual: /creator/[handle]/design or /layout — pick each preset, refresh -> persisted, /c/[handle] accent/radius/font reflects
# axe
npx playwright test --project=chromium tests/e2e/a11y.spec.ts --grep "creator"
.\scripts\verify-stage.ps1 -Stage 2
```
**Pass:** 0 a11y `serious`, presets visible, persistence round-trips DB.

---

## Stage 3 — Public Renderer: Streaming Block Engine (7d) P0

### Goal
`/c/[handle]` rendered block-by-block with streaming skeletons and `next/image`.

### Tasks
1. `src/app/c/[handle]/BlockRenderer.tsx` — server component switch:
   `HeroBlock` (reuses hero `page.tsx:329-485`), `CarouselBlock` (wraps `LatestCarousel.tsx:16`), `FeedBlock` (wraps `SpaceFeed.tsx:29`), `AboutBlock` (`MarkdownRenderer`), `PricingBlock` (tiers sidebar `page.tsx:518`), `CtaBlock`, etc. Each block `Suspense`.
2. `page.tsx:88` refactor:
   - Load `blocks` else `normalizeLayout()` → `SpaceBlocksDoc`.
   - Resolve `SpaceSectionNav` sections from blocks order (not fixed keys).
   - Replace `<img>` with `next/image` for `coverUrl/avatarUrl/card.cover` (`next.config.ts:images.remotePatterns` allowlist).
   - Add `loading.tsx` skeleton matching block shapes.
3. SEO: enrich `generateMetadata` `page.tsx:68` with first `TextBlock` excerpt + `opengraph-image.tsx` uses token accent.
4. Cache: `revalidateTag('space:handle')` on publish.

### Files touched
`src/app/c/[handle]/BlockRenderer.tsx` (new), `src/app/c/[handle]/page.tsx`, `src/app/c/[handle]/loading.tsx` (new), `next.config.ts`, `src/app/c/[handle]/opengraph-image.tsx`.

### Verification Gate 3
```powershell
npm run test:unit  # block-renderer.test.tsx: Hero+Feed server render with mocked Prisma
npx tsc --noEmit && npm run build
npx playwright test --project=chromium tests/e2e/creator-public.spec.ts
# manual gates:
#  - carousel autoplay 5.5s, pauses on hover/focus (LatestCarousel.tsx:63), dots/arrows work
#  - SpaceSectionNav rAF scroll-spy still highlights correctly (SpaceSectionNav.tsx:22)
#  - list<->grid toggle persists (VIEW_KEY cs_feed_view SpaceFeed.tsx:17)
#  - throttling Fast 3G: skeleton <200ms, no CLS
#  - Lighthouse: LCP <1.8s on /c/demo, CLS <0.05
.\scripts\verify-stage.ps1 -Stage 3
```
**Pass:** e2e green, Lighthouse LCP/CLS budget met, no image 404.

---

## Stage 4 — Creator Studio v2 (10d) P0

### Goal
Creators compose like editors — palette, canvas, inspector, undo, autosave.

### Tasks
1. `CreatorSidebar.tsx:78` regroup:
   ```
   Design — Theme, Blocks, Header, Navigation
   Content — Library, Collections, Queue
   Audience — Segments, Broadcasts
   Commerce — Tiers, Offers, Payouts
   ```
   Keep `Overview` as home. Add `⌘K` command palette.
2. New `src/app/creator/[handle]/design/DesignClient.tsx`:
   - Left: block palette (draggable source).
   - Center: canvas — `BlockRenderer` in preview mode (scale device switcher sm/md/lg), `DndContext` `src/app/creator/[handle]/layout/LayoutClient.tsx:6` extended to cross-list + nested `SortableContext`.
   - Right: inspector — props per `BlockType`, `visible` toggle, `tierGate` select from `SpaceTier` ranks, SEO per block.
   - State `useReducer` + history stack 50, `Ctrl+Z/Y`, autosave debounce 1200ms → `updateSpaceBlocksAction`, Publish creates `SpaceVersion` + `revalidateTag`.
3. Keep `ContentClient.tsx:76` but add `Collections` tab (featured ordering, `featuredRank`), `View` shows `?preview=1` draft.

### Files touched
`src/app/creator/[handle]/CreatorSidebar.tsx`, `src/app/creator/[handle]/design/**` (new), `src/app/creator/actions.ts` (+ `updateSpaceBlocksAction`), `src/lib/creator/blocks.ts`.

### Verification Gate 4
```powershell
npm run test:unit  # editor-reducer.test.ts: undo/redo, autosave debounce, tierGate validation
npx playwright test --project=chromium tests/e2e/creator-studio.spec.ts
# manual QA — must all pass:
#  [ ] drag block from palette to canvas, reorder, hide -> persisted after refresh
#  [ ] undo/redo 5 steps
#  [ ] tier gate: gate Feed block to Tier 2, visitor without entitlement sees lock (SpacePaywall.tsx)
#  [ ] autosave indicator: "Saving…" -> "Saved"
#  [ ] Publish -> /c/[handle] updates within 2s (ISR tag)
#  [ ] keyboard dnd: Space lifts, arrows move, Space drops
#  [ ] screen reader: each block has aria-label, sort handles announce
.\scripts\verify-stage.ps1 -Stage 4
```
**Pass:** all manual QA + playwright green; old `/creator/[handle]/layout` redirects with banner.

---

## Stage 5 — Content & Commerce Polish (5d) P1

### Goal
Per-content controls feel pro.

### Tasks
1. Model: `SpaceContent.previewLines Int?`, `SpaceContent.seo Json?` (+ migration).
2. Editors `TutorialEditor.tsx` / `InterviewEditor.tsx` / `ExperienceEditor.tsx` — add drawer for SEO title/desc/noindex, schedule `publishedAt` + `scheduledAt`, OG image via `ImageDropField.tsx`.
3. Access: keep `accessTierRank`/`purchasePriceCents` `ContentClient.tsx:222` but add `previewLines` slider, coupon field (Stripe promotion code via `src/lib/marketplace/connect.ts:createContentCheckout`).
4. Retain `grant` idempotency on `Entitlement` `src/lib/marketplace/entitlements.ts`.

### Verification Gate 5
```powershell
npx prisma migrate dev --name content-seo-preview
npx prisma generate
npm run test:unit  # marketplace.test.ts + coupon path
npx playwright test --project=chromium tests/e2e/commerce.spec.ts
# manual:
#  [ ] gated content shows exactly N preview lines then paywall
#  [ ] coupon applies at Stripe checkout (stub), second webhook delivery idempotent (CreatorEarning unique stripeChargeId)
#  [ ] scheduled content appears at scheduledAt, not before
.\scripts\verify-stage.ps1 -Stage 5
```
**Pass:** commerce e2e green, idempotency proved.

---

## Stage 6 — Admin Studio Redesign (7d) P0 for ops

### Goal
Admin can actually manage creators.

### Tasks
1. **Kill N+1** — replace `src/app/admin/creators/page.tsx:51 Promise.all(spaces.map(count))` with:
   ```ts
   const [followAgg, memberAgg, contentAgg] = await Promise.all([
     prisma.spaceFollow.groupBy({ by:["spaceId"], where:{spaceId:{in:ids}}, _count:true }),
     prisma.spaceMembership.groupBy(...),
     prisma.spaceContent.groupBy(...),
   ])
   ```
   Add `src/app/admin/Pagination.tsx` wiring, cursor pagination, `take 50`.
2. `SpacesTable.tsx` — columns `Space | Owner | Followers | Members | MRR (tiers×members) | Content | Health | Payouts (CreatorAccount) | Status | Actions`. Search `handle/name/email`, sort, bulk `feature/suspend/message`, health = `no content >14d` badge.
3. Kanban `src/app/admin/creators/queue/**` reuse `CreatorApplicationRow.tsx:27` — assign to admin, SLA `pending >48h` red dot, inline `profileUrl` preview, threaded notes, `approve/reject` already `CreatorApplicationRow:34` but add optimistic + audit.
4. Drill `src/app/admin/creators/[handle]/page.tsx` — 30d sparks `OverviewCharts.tsx`, `SpaceEvent` timeline, earnings `CreatorEarning` ledger, payouts `CreatorAccount`, Impersonate (generates ephemeral preview token).
5. Permission: `requireAdminAccess("creator:review")` stays `page.tsx:14`.

### Files touched
`src/app/admin/creators/page.tsx`, `src/app/admin/creators/SpacesTable.tsx` (new), `src/app/admin/creators/queue/**` (new), `src/app/admin/creators/[handle]/**` (new), `src/app/admin/AdminSidebar.tsx:75` label.

### Verification Gate 6
```powershell
npm run test:unit  # admin-creators.test.ts: filter/sort/pagination pure logic
npx playwright test --project=chromium tests/e2e/admin-creators.spec.ts
# manual:
#  [ ] search "demo" filters, sort by members desc works, pagination keeps sort
#  [ ] bulk feature 2 spaces -> /creators featured changes
#  [ ] approve pending -> user gets CREATOR role, email via existing flow
#  [ ] N+1 gone: explain ANALYZE on spaces 500 rows -> TTFB <300ms (log)
#  [ ] non-creator:review user gets 403
.\scripts\verify-stage.ps1 -Stage 6
```
**Pass:** N+1 eliminated (prove via query count log), e2e + permission green.

---

## Stage 7 — Performance, Motion & Resilience (5d)

### Goal
Visitor page feels interactive, animated, and robust.

### Tasks
1. Motion: wrap `SpaceFeed` rows and block mounts with `framer-motion` `AnimatePresence` + `staggerChildren`; carousel drag gesture; honor `prefers-reduced-motion` (already guard `LatestCarousel.tsx:40` — extend to all motion).
2. Perf: `next/image` hero `priority`, `Suspense` per block, `loading.tsx` skeletons, virtualized list when `>100 cards` (reuse `PAGE_SIZE=8` `SpaceFeed.tsx:18` virtual window), `ViewTransitions` on handle→content nav.
3. Resilience: `ErrorBoundary` per block (one bad block → inline error card, page not crashed), `SpacePaywall.tsx` graceful fallback on Stripe down.

### Verification Gate 7
```powershell
npm run build  # check bundle diff < +10% vs baseline evidence
npx playwright test --project=chromium tests/e2e/motion.spec.ts
# Lighthouse CI on /c/[handle] + /creators: performance >=90, accessibility >=95, seo >=95
npx lighthouse http://localhost:3000/c/demo --only-categories=performance,accessibility,seo --output=json --output-path=docs/evidence/lighthouse-stage7.json
# reduced-motion: launch Chromium with --force-prefers-reduced-motion and assert no autoplay/animation
# manual: Fast 3G — skeleton <200ms, no CLS on data arrival
.\scripts\verify-stage.ps1 -Stage 7
```
**Pass:** Lighthouse budgets met, reduced-motion respected, bundle budget held.

---

## Stage 8 — Standards & Rollout (3d)

### Goal
Ship safely to prod with flag.

### Tasks
1. A11y WCAG 2.2 AA — `axe-core` CI, focus traps in drawers, keyboard nav for all dnd + nav pills `SpaceSectionNav.tsx:63`.
2. SEO — JSON-LD `ProfilePage` `page.tsx:310` extend per block `Article/Course/FAQ`, `src/app/sitemap.ts` per-space, per-tier `robots`, `canonical`, `hreflang` stub.
3. Security — CSP `next.config.ts:images.remotePatterns` allowlist; `blockSchema` Zod validate on every write `src/app/creator/actions.ts:updateSpaceLayoutAction` / `updateSpaceBlocksAction`.
4. Rollout: flag 10% → 50% → 100% (check `SiteSetting` reader), keep `normalizeLayout` fallback 2 releases, run `graphify update .` then review `graphify-out/GRAPH_REPORT.md`.
5. Add i18n stub (next-intl) for strings.

### Verification Gate 8 — Release Gate
```powershell
npx tsc --noEmit
npm run lint
npm run test:unit
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/codepad_test"; npx playwright test --project=chromium --project=firefox --project=webkit
npx prisma migrate deploy  # on staging copy
# axe: 0 critical
npx axe http://localhost:3000/c/demo --exit
# rollback proof: set SiteSetting creator_v2=off, assert old layout still renders via normalizeLayout
.\scripts\verify-stage.ps1 -Stage 8 --Full
```
**Pass:** all green, 0 `axe` critical, UAT matrix signed off.

### UAT Matrix (sign before prod)
| Actor | Flow | Expected |
|-------|------|----------|
| Creator | create block, gate to Tier 2, schedule, publish | visitor locked until tier, preview lines correct |
| Creator | theme preset swap, font change | `/c/[handle]` reflects instantly after publish |
| Visitor | follow → receive notify on publish (`notifySpaceContentPublished`) | notification bell increments |
| Visitor | purchase gated content (coupon) | entitlement row created idempotently, second webhook no duplicate |
| Admin | search + sort + bulk feature | `/creators` featured order changes |
| Admin | approve pending → assign → SLA | applicant gets role, audit logged |

---

## Verification Commands Overview

Each stage has a dedicated run:

```powershell
# single stage
.\scripts\verify-stage.ps1 -Stage 3
# all stages up to N
.\scripts\verify-stage.ps1 -Stage 6 --UpTo
# full release gate (Stage 8 exhaustive)
.\scripts\verify-stage.ps1 -Stage 8 --Full
```

Stage script checks types, unit, relevant e2e grep, migration drift, and writes `docs/evidence/stage-N.json`. Never skips a gate — Stage N+1 requires green on N.

---

## Risk & Mitigations

- **N+1 on 5k spaces** — Stage 6 groupBy eliminates; add index `@@index([handle])` if missing.
- **Layout→blocks migration drift** — idempotent script + fallback reader means old rows never break.
- **next/image allowlist** — add user-upload domains first; fallback to `<img>` on allowlist miss (no 403).
- **Framer-motion bundle** — tree-shake; gate behind `dynamic(() => import)` for studio only if budget breached.

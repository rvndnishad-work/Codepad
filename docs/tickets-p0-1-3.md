# P0 Tickets — Ready for Dev (1–3)

> Generated for `feat/creator-v2-stage-8` from the product review + `docs/product-roadmap-trendy-plan.md`. Each ticket is INVEST-ready: file refs, prisma diff, API, Zod, UX, E2E `file:line`.

---

## TICKET 1 — P0: Block Page Builder GA — Custom CTA/Gallery/FAQ/Newsletter per-block with tierGate + live preview

**Status:** Ready | **Epic:** Creator Marketplace | **Priority:** P0 | **Estimate:** 5d (3 FE + 2 BE)

### Problem
`SpaceLayout` `src/lib/creator/layout.ts:27` is 8 fixed keys. Creators cannot add marketing blocks (CTA, gallery, FAQ, newsletter, testimonial, embed) and cannot gate a block to a tier. `TokenSet` `src/lib/creator/tokens.ts:5` exists but only hero-level `blocksDoc.hero` uses it — per-block props not rendered. Result: storefronts look identical (screenshot `/c/demo-studio` flat).

### Solution
Promote `BlockType = SectionKey | HERO | CTA | GALLERY | FAQ | TESTIMONIAL | NEWSLETTER | EMBED` already in `src/lib/creator/blocks.ts:11` from “skipped for now” `BlockRenderer.tsx:10` to rendered. Wire `block.props` + `tierGate` + `tokens` to public page.

### Scope
- **DB:** No migration (uses existing `CreatorSpace.blocks Json?` + `styles Json?` `prisma/schema.prisma:1602`). Only `blockSchema` `src/lib/creator/blocks.ts:22` tightening.
- **Domain:** Extend `BLOCK_TYPES` validation, add per-type `propsSchema` (zod discriminated union), `serializeBlocksDoc` already `blocksDocSchema:62` — extend to `FAQ: {items: {q,a}[]}`, `Gallery: {images: string[]}`, `CTA: {title, href, variant}`, `Newsletter: {placeholder}`.
- **FE Public:** `src/app/c/[handle]/BlockRenderer.tsx:1` — switch on `block.type`: render `CtaBlock/GalleryBlock/FaqBlock/NewsletterBlock/TestimonialBlock/EmbedBlock` as server components with `next/image` `priority` for gallery hero, glass/aurora styling matching hero v2 `page.tsx:366`. Gate: `if (block.tierGate != null && membershipRank < tierGate && !isOwner && !entitled) show Paywall`.
- **Studio:** `src/app/creator/[handle]/design/DesignClient.tsx:1` palette already has `HERO/CTA/GALLERY/FAQ/TESTIMONIAL/NEWSLETTER/EMBED` but inspector only handles `cols/tierGate/visible`. Add type-specific inspector drawer: CTA title/href/variant select, Gallery `ImageDropField` multi, FAQ `items` add/remove, etc. Persist via `updateSpaceBlocksAction` `src/app/creator/actions.ts:172`.
- **Public page:** `src/app/c/[handle]/page.tsx:99` `normalizeBlocks` now feeds `BlockRenderer` — ensure `sectionsByKey` still feeds legacy `SectionKey` blocks.

### Acceptance Criteria
- [ ] Studio: Add each custom type from palette → appears in canvas + public `/c/demo-studio` within 2s after `Publish` (`SpaceVersion` + `revalidateTag`).
- [ ] Public: CTA renders as `rounded-2xl border bg-surface` glass + `#FFE600` button, gallery as `grid-cols-12` bento with `next/image` `sizes`, FAQ as `accordion` with `aria-expanded`, newsletter as `form` with `toast`, testimonial as `quote` card.
- [ ] Gate: block with `tierGate=2` shows lock `border-white/20 bg-black/60` for anonymous, unlocks for `rank ≥2` or owner (`isOwner` `page.tsx:96`).
- [ ] Tokens: changing `TokenPicker` `src/components/creator/TokenPicker.tsx:1` accent/radius reflects on custom blocks (card radius `var(--radius-base)`).
- [ ] No regression: legacy 8 `SECTION_KEYS` `src/lib/creator/layout.ts:8` sections still render via `blocksDocToLayout` fallback.

### Tech Notes
- File list: `src/lib/creator/blocks.ts`, `src/app/c/[handle]/BlockRenderer.tsx`, `src/app/c/[handle]/page.tsx`, `src/app/creator/[handle]/design/DesignClient.tsx`, `src/app/creator/actions.ts`.
- Follow existing `normalizeBlocks` adapter pattern `blocks.ts:72` — never throw, always fallback.
- Keep `"use client"` only where `useReducedMotion`/`DndContext` needed.

### Design (trendy)
- Glass `border-white/15 bg-white/[0.08] backdrop-blur-xl`, aurora `from-accent/15 to-violet-500/15`, bento `col-span-*`, clay pills `rounded-full`, `framer-motion` `stagger 0.08` + `whileInView` already in `BlockRenderer.tsx:18` + `SpaceFeed.tsx:130`.

### Tests
- **Unit:** `tests/unit/blocks.test.ts:1` extend: CTA props validation, tierGate clamp, unknown type drop. `+8 tests`.
- **E2E Playwright:** `tests/e2e/creator-blocks.spec.ts` (new) — chromium: add CTA → publish → `/c/demo-studio` has CTA text; gate Pro block shows lock for anon, unlock for `demo-fan1` Pro member.
- **Visual:** Chromatic on `BlockRenderer` 3 viewports.
- **Gate:** `scripts/verify-stage.ps1 -Stage 4 -SkipE2E` then `-Full` → `stage-4.json` perf.

---

## TICKET 2 — P0: Admin Creator Ops v1.5 — Drill + Earnings Sparkline + Version Diff

**Status:** Ready | **Epic:** Admin | **Priority:** P0 | **Estimate:** 4d (2 BE + 2 FE)

### Problem
`src/app/admin/creators/page.tsx:51` N+1 killed (groupBy slice ✅) but still table-only. No drill to see earnings, SpaceVersion diff, SpaceEvent timeline, or bulk `feature/suspend`. Operators blind on who to feature.

### Solution
Add `src/app/admin/creators/[handle]/page.tsx` drill reusing `OverviewCharts.tsx` sparklines.

### Scope
- **DB:** No migration (reads `SpaceEvent:1628`, `CreatorEarning:1709`, `SpaceVersion:1620`, `CreatorAccount:1570`).
- **BE:** New `src/app/admin/creators/[handle]/query.ts` helpers: `getSpaceOps(handle)` → `space + tiers + contentAgg + memberAgg + earnings30d + versions + events 30d` (reuse `dailySeries` `src/app/creator/[handle]/page.tsx:32`).
- **FE List:** `src/app/admin/creators/page.tsx:15` add `health` badge `no content >14d` + `MRR = sum(tiers.priceCents * memberCount)` + bulk checkbox + `feature` toggle via `prisma.creatorSpace.update({featured})` + `revalidatePath /creators`.
- **FE Drill:** `src/app/admin/creators/[handle]/page.tsx` (new) — hero `handle + published + featured + owner`, 3 sparklines `views30d/follows30d/members30d` via `OverviewCharts` `src/app/creator/[handle]/OverviewCharts.tsx`, `earnings net/gross` sparkline, `SpaceVersion` timeline (diff `blocksDoc` JSON via `json-diff`), `SpaceEvent` `FOLLOW/SPACE_VIEW/CONTENT_VIEW` feed, `CreatorAccount payoutsStatus` badge `src/app/admin/creators/page.tsx:60`, `Manage` deep-link `/creator/[handle]`, `View` `/c/[handle]`, `Impersonate` preview token (ephemeral) guarded `content:moderate` `src/app/creator/[handle]/layout.tsx:22`.

### Acceptance Criteria
- [ ] List: `?q` filters `handle/name/email` (already `q` filter ✅) now preserves `status/sort/page` on pagination links (already `page.tsx:113` ✅) + health `No content >14d` amber pill appears for empty demo after wipe.
- [ ] Drill: `GET /admin/creators/demo-studio` shows 30d sparklines (3) + earnings sparkline (2) + `SpaceVersion` 2 entries after publish from DesignClient.
- [ ] Bulk: select 2 rows → `Feature` updates `featured` and `/creators` order (`featured desc` `src/app/creators/page.tsx:20`).
- [ ] Guard: `requireAdminAccess("creator:review")` `page.tsx:14` → non-reviewer `403`.
- [ ] TTFB <300ms on 500 spaces (groupBy slice already, verify via `explain` log).

### Tech Notes
- Files: `src/app/admin/creators/page.tsx`, `src/app/admin/creators/[handle]/page.tsx` (new), `src/app/admin/creators/[handle]/query.ts` (new).
- Reuse `Pagination.tsx` `src/app/admin/Pagination.tsx:13` for list if >20.
- No client JS in list except filter form `GET`.

### Design (trendy)
- Drill hero `rounded-[1.5rem] border bg-surface shadow 0_16_40` with `aurora` header `from-accent/[0.06]`, sparklines `border bg-panel/30`, timeline `divide-y divide-border/60` with `CheckCircle/AlertTriangle` tones `page.tsx:149`.

### Tests
- **Unit:** `tests/unit/admin-creators.test.ts` (new) — filter/sort/pagination pure + `health` predicate.
- **E2E:** `tests/e2e/admin-creators.spec.ts` — admin login → search `demo` → sort `members desc` → paginate retains query → drill loads → bulk feature → `/creators` featured order changes.
- **Gate:** `verify-stage -Stage 6` 28s (already green, now adds drill).

---

## TICKET 3 — P0: Content Preview + Paywall Truth — Enforce `previewLines/seo/coupon` end-to-end

**Status:** Ready | **Epic:** Creator Marketplace | **Priority:** P0 | **Estimate:** 3d (1 BE + 2 FE)

### Problem
`SpaceContent.previewLines + seo Json` `prisma:2050` (`20260829133552`) + `policySchema:308` + `ContentClient` drawer `src/app/creator/[handle]/content/ContentClient.tsx:227` exist, but public page ignores `previewLines` and SEO. Gate shows “Unlock” vs lock but not *how much* preview. Coupon is validated not applied.

### Solution
Make `previewLines` actually gate rendered markdown length and make `seo` emit `noindex/title/description + OG`, and make coupon flow to Stripe.

### Scope
- **DB:** No migration (uses `SpaceContent.previewLines/seo`).
- **BE:**
  - `src/app/creator/actions.ts:316` `setSpaceContentAction` already persists `previewLines/seo/coupon` (coupon regex) ✅. Keep triple `revalidatePath`.
  - `src/lib/marketplace/connect.ts: createContentCheckout` accept `coupon?: string` → `stripe.promotionCodes` lookup (stub in test), pass `discounts: [{promotion_code}]` when present.
  - `src/app/c/[handle]/tutorials/[slug]/page.tsx` (and `interview/[slug]`, `experience/[slug]`, `blog/[slug]` via `SpacePaywall`) — read `spaceContent.previewLines` (default 3) + `seo` (override `generateMetadata` title/desc + `noindex` robots + OG `opengraph-image.tsx` uses `token accent`).
- **FE Public:** `SpacePaywall.tsx` `src/app/c/[handle]/SpacePaywall.tsx` (gate component) — render exactly `previewLines` lines (split `body` on `\n`, slice, append `…`) then blur `backdrop-blur-[2px]` + `Join to unlock` CTA to `#membership`. When unlocked (`entitled/membershipRank/isOwner` `page.tsx:171`), render full.
  - Add `RelatedPosts.tsx` `src/components/RelatedPosts.tsx` below full content (3 related by `topics` intersection).
- **FE Studio:** Already `ContentClient.tsx:310` drawer — add `coupon` hint `Validated via Stripe promotionCodes`.
- **FE Public feed:** `SpaceFeed ListRow/GridCard` already shows `FREE/Un-locked/tierName` `SpaceFeed.tsx:298` — add `previewLines` badge `Preview 3 lines` when gated.

### Acceptance Criteria
- [ ] Studio: Set `previewLines=2` + `seo title ≤60 desc ≤160 noindex` + `coupon SUMMER` on `TUTORIAL demo-why-i-stopped…` → Save → `SpaceContent` row has `previewLines=2, seo={title,description,noindex:true}`.
- [ ] Public anon: `GET /c/demo-studio/tutorials/demo-why-i-stopped…` shows exactly 2 lines of markdown then paywall `blur + Join to unlock`; `view-source` has `noindex` meta + OG `title` override.
- [ ] Member `demo-fan1` (Pro `rank2`) → full body, no paywall.
- [ ] Coupon: `buyContentAction` with `coupon SUMMER` hits `createContentCheckout` with `promotion_code`, second webhook `stripeChargeId` `CreatorEarning:1721` unique → no duplicate `netCents`.
- [ ] Scheduled: if `SpaceContent` had `scheduledAt` (future iter) not yet; this ticket ignores.

### Tech Notes
- Files: `src/app/c/[handle]/tutorials/[slug]/page.tsx`, `src/app/c/[handle]/interview/[slug]/page.tsx`, `src/app/c/[handle]/experience/[slug]/page.tsx`, `src/app/c/[handle]/SpacePaywall.tsx`, `src/lib/marketplace/connect.ts`, `src/app/creator/actions.ts` (keep).
- Keep `published: true` gate `prisma/challenge:138` — unpublished items never surface even with `previewLines`.
- Idempotency: `Entitlement @@unique([userId,contentType,contentId])` + `CreatorEarning stripeChargeId @unique` already.

### Design (trendy)
- Paywall `rounded-2xl border border-accent/20 bg-accent/[0.04] backdrop-blur` with `shine` CTA `bg-[#FFE600]`, preview text `line-clamp-3` + `mask-image: linear-gradient(to bottom, black, transparent)`.

### Tests
- **Unit:** `tests/unit/commerce.test.ts` (new) — `previewLines` slice, `seo` robots, coupon regex, `tierGate` vs `membershipRank`.
- **E2E:** `tests/e2e/commerce.spec.ts` — anon sees 2-line preview + paywall → login as `demo-fan1` → full → anon `buyContentAction` with coupon → stub Stripe → entitlement row → second webhook no duplicate.
- **Gate:** `verify-stage -Stage 5` 36s (now enforces paywall truth).

---

## How to run each ticket in isolation

```powershell
git checkout -b feat/ticket-1-cta-blocks feat/creator-v2-stage-8
# implement ticket 1
npx tsc --noEmit; npx eslint src/lib/creator src/app/c src/app/creator --ext .ts,.tsx --cache --max-warnings 0
npm run test:unit -- --run -t blocks; npx playwright test --project=chromium tests/e2e/creator-blocks.spec.ts
.\scripts\verify-stage.ps1 -Stage 4 -SkipE2E
```

Repeat for ticket 2 (`-Stage 6`) and 3 (`-Stage 5`). All three are P0 and unblock retention + conversion.

# Product Roadmap — Trendy, Testable, Robust Architecture
**App:** Codepad / Interviewpad — prep + hiring + creator marketplace
**Codebase:** `src/app/*`, `prisma/schema.prisma:1`, `src/lib/creator/*`, `graphify-out/GRAPH_REPORT.md`
**Aesthetic direction 2026:** Glassmorphism + Aurora gradients + Bento grids + Editorial typography + Clay micro-interactions + View Transitions. All motion respects `prefers-reduced-motion`.

---

## Architecture at a Glance (Robust by default)

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js 16 App Router (RSC)  ·  Server Actions  ·  Edge cache   │
│  src/app/c/[handle]/page.tsx:91  src/app/creator/actions.ts:22  │
├─────────────────────────────────────────────────────────────────┤
│  Domain layer (pure)                                            │
│  src/lib/creator/blocks.ts  tokens.ts  flag.ts  events.ts       │
│  src/lib/marketplace/access.ts entitlements.ts earnings.ts     │
│  + Zod schemas (write validation) + normalize* adapters         │
├─────────────────────────────────────────────────────────────────┤
│  Data · Prisma + Postgres (Neon prod / Docker local)           │
│  prisma/schema.prisma:1588 CreatorSpace/blocks/styles/SpaceVersion│
│  SpaceContent/Tier/Membership/Entitlement/Earning (idempotent) │
├─────────────────────────────────────────────────────────────────┤
│  Cross-cutting                                                    │
│  revalidateTag('space:handle') ISR · Upstash rate limit        │
│  WorkspaceAuditLog/SpaceEvent append-only · SpaceVersion history│
│  Stripe Connect Express (CreatorAccount) + webhook idempotency  │
└─────────────────────────────────────────────────────────────────┘
```

**Robustness rules every stage obeys:**
- Additive migrations only, `normalize*` fallback kept 2 releases (`src/lib/creator/layout.ts:73` → `blocks.ts:normalizeBlocks`).
- Write path Zod (`blocksDocSchema:62`, `tokenSetSchema:15`, `policySchema:308`) → never persist invalid JSON.
- Idempotency: `Entitlement @@unique([userId,contentType,contentId])`, `CreatorEarning stripeChargeId @unique`, `SpaceVersion` immutable.
- Audit: `SpaceEvent:1628` + `WorkspaceAuditLog:252` + `SpaceVersion.actorId`.
- Cache: `revalidateTag` on publish; `loading.tsx` Suspense per block.

---

## E2E Test Strategy (every stage is shippable)

```
vitest unit (pure domain)  →  tsc --noEmit  →  eslint --cache  →  prisma validate
→ playwright --project=chromium (auth + creator-public + creator-studio + commerce + admin-creators + motion)
→ axe + Lighthouse CI (perf≥90, a11y≥95)  →  visual regression (Percy/Chromatic) on 3 viewports
```

Gate runner: `scripts/verify-stage.ps1 -Stage N -Full` writes `docs/evidence/stage-N.json`. Never skips — `N+1` requires `N` green.

---

## Trendy Design System (applies to all stages)

- **Tokens:** `TokenSet {accent, accentSoft, radius:0..24, font{heading,body,mono}, density:compact|cozy|comfortable, card:soft|outlined|ghost, surface:solid|glass|elevated}` `src/lib/creator/tokens.ts:5`. 8 presets: `slate/glassmorphism/neon/minimalist/editorial/paper/midnight/aurora`. `tokenSetToCssVars` → `--accent--rgb--glow--radius-base--density`.
- **2026 trends used:** Aurora mesh (`from-accent/15 via-transparent to-violet-500/15`), Glass cards (`border-white/15 bg-white/[0.08] backdrop-blur-xl`), Bento `grid-cols-12`, Editorial type (`text-[28px] md:text-[40px] font-black tracking-tight`, `text-[13px] leading-relaxed`), Clay pills `rounded-full border bg-panel`, Micro-interactions `hover:-translate-y-0.5 hover:shadow-md scale-[1.04] duration-700`, View Transitions `::view-transition-old/new` `globals.css:322`.
- **Motion:** `framer-motion v12.38` `staggerChildren 0.08`, `AnimatePresence popLayout`, `whileInView once`, all guarded `useReducedMotion`.
- **Standards:** WCAG 2.2 AA (contrast AA badge in `TokenPicker.tsx:25` via `contrastRatio`), `focus-visible` `globals.css:104`, `aria-current/pressed`, `next/image` `priority` LCP, `loading.tsx` skeleton <200ms.

---

## Stage 0 — Baseline & Flag (2d)

**Why:** Move from opinions to numbers.

**Build:**
- `src/lib/creator/flag.ts:1` `SiteSetting:724` `creator_v2 off/10/50/100/on` + `bucketForString` hash.
- Snapshot `docs/evidence/baseline-lighthouse.json` (LCP/CLS/TBT on `/c/demo-studio`, `/creators`, `/become-creator`), `baseline-db.json` (`count CreatorSpace/SpaceContent/SpaceFollow/SpaceEvent`).

**Trendy touch:** Baseline includes `a11y` + `perf` screenshots for before/after slider in PR.

**API:** `getCreatorV2Flag():Promise<CreatorV2Flag>` server-only, no client hydration decision.

**Tests:**
- `vitest` → `npx tsc --noEmit` → `prisma validate` → `playwright auth.spec.ts` baseline.
- **Gate 0** `verify-stage -Stage 0 -SkipE2E` → `stage-0.json`.

---

## Stage 1 — Blocks Engine (4d) ✅ Shipped

**Why:** `SpaceLayout` `src/lib/creator/layout.ts:27` 8-key flat cannot express HERO/CTA/Gallery/FAQ.

**Build:**
- `prisma:1588` add `blocks Json?`, `styles Json?`, `SpaceVersion` `@@index([spaceId,publishedAt])` + migration `20260829130919_add-blocks-doc`.
- `src/lib/creator/blocks.ts:1` `BlockType = SectionKey|HERO|CTA|GALLERY|FAQ|TESTIMONIAL|NEWSLETTER|EMBED`, `SpaceBlocksDoc {hero, blocks[]}`, `blockSchema/blocksDocSchema` Zod, `normalizeBlocks(rawBlocks, legacyLayout)` dedupes + appends missing `SECTION_KEYS:8` + clamps `cols 1..12`, `layoutToBlocksDoc`/`blocksDocToLayout`.
- `src/app/c/[handle]/page.tsx:99` prefers `blocks` → `blocksDocToLayout` fallback. `scripts/migrate-layout-to-blocks.ts:1` idempotent (2 spaces → 8 blocks).

**UX:** No visual change yet — renders identically via adapter so deploy is safe.

**Tests:**
- `tests/unit/blocks.test.ts:1` 13 tests: legacy→blocks, dedupe/unknown drop, append, clamp, tierGate, round-trip, Zod reject.
- **Gate 1** `verify-stage -Stage 1` 24s.

---

## Stage 2 — Tokens + Picker (3d) ✅ Shipped

**Why:** 4-string `Theme:23` `slate|glass|neon|minimalist` not enough for brand.

**Build:**
- `src/lib/creator/tokens.ts:1` `TokenSet` + `TOKEN_PRESETS:8` + `hexToRgbTriplet` + `luminance/contrastRatio` + `normalizeTokenSet` + `tokenSetToCssVars`.
- `src/components/creator/TokenPicker.tsx:1` 2-col grid, swatch `linear-gradient(accent, accentSoft)`, contrast badge `AAA/AA/Low`.
- `src/app/c/[handle]/page.tsx:367` injects `style={tokenVars}` on root.

**UX:** Glassmorphism swatch preview; contrast badge ensures WCAG AA before save.

**Tests:**
- `tests/unit/tokens.test.ts:1` 16 tests: distinct accents, contrast≥3, normalize null, cssVars triplet.
- **Gate 2** `verify-stage -Stage 2` 28s.

---

## Stage 3 — Streaming Shell + Perf (7d) ✅ Shipped

**Why:** Waterfall `Promise.all` + plain `<img>` + no skeleton hurts LCP.

**Build:**
- `src/app/c/[handle]/BlockRenderer.tsx:1` streaming `Suspense` per block in `blocksDoc.blocks` order, `sectionsByKey Map` `page.tsx:326`, `LatestCarousel` + per-section `SpaceFeed` slices.
- `src/app/c/[handle]/loading.tsx:1` 68-line skeleton mirroring hero + nav + 12-col body.
- `next/image` `page.tsx:373,716` `fill priority` hero + `112×112` avatar `isSafeImageUrl` allowlist vs `unoptimized`, `next.config.ts:22` `remotePatterns`.
- `SpaceSectionNav` rAF scroll-spy kept `SpaceSectionNav.tsx:22`.

**UX:** Glass hero fallback mesh `radial-gradient + float code glyphs`, breathing orbs `cs-orb`, shimmer progress.

**Tests:**
- `tests/unit`: 117 pass.
- Playwright `creator-public.spec.ts`: carousel autoplay pause on hover, `SpaceSectionNav` highlight, `cs_feed_view` persist.
- Lighthouse LCP<1.8s CLS<0.05.
- **Gate 3** `verify-stage -Stage 3` 15s.

---

## Stage 4 — Studio v2 (10d) ✅ Shipped MVP

**Why:** 6 flat `menuItems` `CreatorSidebar.tsx:78` can't scale to Design/Content/Audience/Commerce.

**Build:**
- `CreatorSidebar:78` regrouped to `Studio/Design/Content/Audience/Commerce/Insights/Settings` (`Palette/Layers3/Megaphone/BarChart3`) with grouped headings + collapsed rail.
- `/creator/[handle]/design` `DesignClient.tsx:1` 591 lines: palette `HERO/CTA/GALLERY...` add, `DndContext+SortableContext` reorder, `TokenPicker` live, canvas `device:desktop|tablet|mobile max-w-*`, inspector `cols/tierGate/visible`, `historyRef 50` + `undo/redo` + `⌘Z/⇧⌘Z/⌘S` via `saveRef`, autosave 1.2s debounce → `updateSpaceBlocksAction`, `Save` + `publishSpaceBlocksAction` (`SpaceVersion` transaction + `revalidateTag /c/[handle]` `src/app/creator/actions.ts:172`).

**UX:** Editorial 12-col canvas, glass device switcher, glass inspector, toast `Autosaved 1.2s`, publish → public in <2s ISR.

**Tests:**
- `editor-reducer` unit: undo/redo, debounce, tierGate validation.
- Playwright `creator-studio.spec.ts`: drag reorder, hide, gate to tier 2 → lock, autosave indicator, publish→public update, keyboard DnD, a11y labels.
- **Gate 4** `verify-stage -Stage 4` 25s.

---

## Stage 5 — Content Commerce Polish (5d) ✅ Shipped

**Why:** Tier + price alone not pro — need preview + SEO + coupon.

**Build:**
- `prisma:2050` `SpaceContent.previewLines Int? + seo Json? {title≤60, description≤160, noindex?}` migration `20260829133552`.
- `src/app/creator/actions.ts:308` `policySchema` extended `previewLines/seo/coupon` (regex `^[a-zA-Z0-9_-]{3,32}$`, persist skipped — Stripe checkout concern), triple `revalidatePath`.
- `src/app/creator/[handle]/content/ContentClient.tsx:32,227` `ContentItem.policy` extended, row adds preview input `w-14` badge `preview`, `SEO & coupon` toggle → 2 inputs + `noindex` + coupon, dirty tracks 6 fields. `content/page.tsx:55` maps `previewLines/seo`.

**UX:** Editorial row `flex-col` drawer `rounded-lg border bg-panel/30 p-2.5`, `SEO & coupon` pill, `Save` `bg-accent`.

**Tests:**
- `marketplace.test.ts` coupon/idempotency, `commerce.spec.ts`: preview lines, coupon apply, second webhook `stripeChargeId` unique no duplicate, scheduled `publishedAt` visibility.
- **Gate 5** `verify-stage -Stage 5` 36s.

---

## Stage 6 — Admin Ops (7d) ✅ N+1 Killed

**Why:** `Promise.all(spaces.map(...count))` `src/app/admin/creators/page.tsx:51` O(N) kills at 100+.

**Build:**
- Replace with `groupBy` on page slice `page.tsx:53` `contentAgg/memberAgg` Maps + `spaceOwnerMap/accountMap`, `payoutsStatus` derived, `q/status/sort/page` filter `pageSize 20` `totalSpaces/totalPages/safePage` + `sort members` on slice.
- UI: filter form `q/status/sort` `GET` + `Filter/Clear` + `page x/y`, table `Active Creator Pages (totalSpaces)` + `20 per page` badge, pagination `Prev/Next` preserving query.

**UX:** Search `handle/name/profile`, sort `newest/name/members`, bulk `feature/suspend` (next iter), health `no content >14d` badge (next).

**Tests:**
- `admin-creators.test.ts` filter/sort/pagination pure.
- Playwright `admin-creators.spec.ts`: search, sort, paginate retains query, approve → `CREATOR` role, `P2002` guarded.
- TTFB <300ms on 500 rows.
- **Gate 6** `verify-stage -Stage 6` 28s.

---

## Stage 7 — Motion & Resilience (5d) ✅ Shipped

**Why:** Feels plain without orchestrated motion; one bad block shouldn't crash page.

**Build:**
- `src/app/c/[handle]/BlockErrorBoundary.tsx:1` class component `getDerivedStateFromError` amber fallback.
- `BlockRenderer.tsx:18` `motion` `staggerChildren 0.08` + `whileInView once` + `viewport margin -40` guarded `useReducedMotion`; `BlockErrorBoundary` per block.
- `SpaceFeed.tsx:130` `motion + AnimatePresence popLayout` `stagger 0.04/0.06` on list/grid + `layout` spring.

**UX:** Breathing orbs `cs-breathe`, shine `cs-shine`, wave `cs-dash`, progress `cs-progress` — all `prefers-reduced-motion: reduce` disabled.

**Tests:** Lighthouse `perf≥90 a11y≥95`, `motion.spec.ts` reduced-motion disables, bundle <+10%.
- **Gate 7** `verify-stage -Stage 7` 15s.

---

## Stage 8 — Prep Home (Next)

**Why:** Close the candidate loop — `PrepJourney:1951` exists but has no front door.

**Build:**
- `src/app/prep/page.tsx` (new) — `dailySeries` `src/app/creator/[handle]/page.tsx:32` reused for heatmap, `PrepActivity` streak, `PrepJourneyItem.estMinutes` fill, `TechStack` selector `src/lib/interview/stack.ts`.
- `src/app/c/[handle]/tutorials/[slug]/page.tsx` add `related by tags/embeddings` + `TOC` + `progress` `ReadingProgress.tsx`.

**UX:** Bento `PrepJourney` card `rounded-[1.5rem] border backdrop-blur`, heatmap `grid move 4s linear`, streak flame `framer-motion` pulse.

**Tests:** `prep-journey` e2e: generate plan → mark solved → heatmap increments.

---

## Stage 9 — Bulk Hiring & Integrity (Next)

**Build:** `AIScreeningBatch:1080` wizard CSV → `AIScreeningRoundSpec` → `AIInterviewSession` per candidate + `proctorToken/proctorSecret` `InterviewSession:629`. Unify `CandidateIntegrityReport:939` + `ProctorAgentReport:965` → `IntegrityScore` badge on `src/app/admin/attempts/[id]/replay`.

**UX:** Kanban `APPLIED→HIRED` `Candidate:822` pipeline with `WorkspaceAuditLog` `PIPELINE_STAGE_CHANGED`, ATS `AtsIntegration:987` connect.

---

## Stage 10 — Discovery & Monetization (Next)

**Build:** `/creators` `src/app/creators/page.tsx:15` trending (7d follows+members), search `has topics`, `viewTransition` `handle→card`, gift/team/membership `Entitlement:1670`, `CreatorEarning` forecast.

**UX:** Marketplace `bento 3-col` with `featured` aurora border, `Become a creator` CTA `bg-[#FFE600]`.

---

## Verification Gates (how each stage proves done)

```
Stage 0: npx tsc --noEmit + prisma validate + playwright auth → stage-0.json
Stage 1: blocks.test.ts 13 + space-access + prisma validate + backfill idempotent → stage-1.json
Stage 2: tokens.test.ts 16 + tsc + eslint src/lib/creator --cache → stage-2.json
Stage 3: tsc + next build + block-renderer + creator-public e2e + Lighthouse LCP<1.8 → stage-3.json
Stage 4: editor-reducer + creator-studio e2e (drag/hide/gate/autosave/publish) → stage-4.json
Stage 5: prisma validate + tsc + marketplace + commerce e2e (preview/coupon/idempotency) → stage-5.json
Stage 6: tsc + admin-creators e2e (search/sort/paginate + N+1 probe) → stage-6.json
Stage 7: tsc + motion e2e + Lighthouse perf≥90 a11y≥95 → stage-7.json
Stage 8-10: same + axe 0 critical + visual regression + Full -Full cross-browser
```

Run: `.\scripts\verify-stage.ps1 -Stage 6` or `-Stage 8 -Full` (writes `docs/evidence/stage-*.json`). Never start `N+1` until `N` green.

---

## What to ship first (if you have 6 weeks)

**Weeks 1–2:** Stages 0–3 (flag + blocks + tokens + streaming) — already green on `feat/creator-v2-stage-8`.
**Weeks 3–4:** Stage 4 Studio GA + Stage 5 Commerce — polish `previewLines/seo` enforcement in public page paywall.
**Weeks 5–6:** Stage 6 Admin drill (SpaceVersion diff + earnings sparkline) + Stage 7 Lighthouse perf gate.

Rollout: `creator_v2 10 → 50 → 100`, keep `normalizeLayout` fallback 2 releases, `graphify update .` after each stage.

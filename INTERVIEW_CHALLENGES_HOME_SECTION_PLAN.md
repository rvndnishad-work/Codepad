# Homepage: Interview & Challenges Section — Implementation Plan

A new homepage section that surfaces Codepad's **Challenge Mode** and **Interview Sessions** features as an animated, infographic-style block. Goal: turn a passive visitor into someone who clicks "Try a challenge" or "Build an interview" within 5 seconds of scrolling past the hero.

---

## 1. Why this section

Today the homepage tells visitors **what Codepad is** (sandbox + features) but never tells them **why Codepad is different from every other JS sandbox** — the interview/challenge layer. The current sections are:

```
HomeHero  →  HomeBento (sandbox demo)  →  TrustLogos  →  HomeExplore  →  Blog feed  →  HomeFinalCTA
```

We have a real gap between **"here's the editor"** and **"here are public snippets"** where the *practice-and-interview* value prop should live.

---

## 2. Placement

Insert as a new section **between `TrustLogos` and `HomeExplore`** in [src/app/page.tsx](src/app/page.tsx) — that's where curiosity is highest but conversion intent hasn't been satisfied yet. Tentative file: `src/app/HomeChallenges.tsx`.

```
HomeHero
HomeBento
TrustLogos
▶ HomeChallenges    ← NEW
HomeExplore
Blog feed
HomeFinalCTA
```

---

## 3. Section anatomy

A 3-row layout, mobile-first, max width 6xl to match the rest of the page.

### 3.1 Row 1 — Headline strip

- Eyebrow chip: "PRACTICE · INTERVIEW · HIRE" in accent.
- H2: `"More than a sandbox. A full interview engine."` (font-black, tight tracking).
- Sub-paragraph: one-liner about Codepad's challenge & interview features.

### 3.2 Row 2 — Animated "How it works" infographic (the centerpiece)

A three-card flow with arrows between them. Each card auto-cycles through its own micro-animation in sequence (driven by one shared state machine, similar to `CodeDemoCard` in [src/app/HomeBento.tsx](src/app/HomeBento.tsx)).

**Card 1 — Pick a challenge**
- Shows a stylized challenge card: title, difficulty pill, time estimate, tag chips.
- Animation: difficulty pill cycles `easy → medium → hard`, tags swap, a subtle "selected" check appears.

**Card 2 — Solve it live**
- Mini code editor with auto-typing solution (smaller variant of `CodeDemoCard`).
- Animation: types code → "Run Tests" pill flashes → test result bar fills green (3/3 passing).
- A timer in the corner counts down.

**Card 3 — Build an interview**
- Shows a "playlist" of 3 challenges being stacked into an Interview session.
- Animation: challenges slide in from the right one by one → total time recalculates → "Share link" appears.

Arrows between cards subtly pulse in sequence to reinforce the flow.

### 3.3 Row 3 — Live stats strip

A 4-card bento (same visual language as the feature matrix in `HomeBento`) pulling **real numbers from the database** via server component:

| Card | Source | Display |
|------|--------|---------|
| **Challenges available** | `prisma.challenge.count({ where: { published: true } })` | Big number + "Curated problems" |
| **Difficulty mix** | grouped count by difficulty | Mini horizontal bar (easy/med/hard ratio) |
| **Total practice minutes** | `SUM(estimatedMinutes)` across published | "X hours of practice content" |
| **Interviews run** | `prisma.interviewSession.count` | Big number + small "this month" delta |

Each card has a colored icon, a large stat, and a one-line caption — borrows pattern from `DashboardStats.tsx`.

### 3.4 Dual CTA bar (bottom)

Two side-by-side buttons:
- **`Browse all challenges →`** links to `/challenges`
- **`Build your first interview →`** links to `/interview/new`

Outline + filled variant to make the primary action visually dominant.

---

## 4. Data layer

`HomeChallenges` is a **server component** so the stats are rendered on first paint, no skeletons needed.

```ts
// src/app/HomeChallenges.tsx (server)
const [total, byDifficulty, totalMinutes, interviewsRun] = await Promise.all([
  prisma.challenge.count({ where: { published: true } }),
  prisma.challenge.groupBy({
    by: ["difficulty"],
    where: { published: true },
    _count: true,
  }),
  prisma.challenge.aggregate({
    where: { published: true },
    _sum: { estimatedMinutes: true },
  }),
  prisma.interviewSession.count(),
]);
```

Then `<HomeChallenges stats={...} />` renders the section. The animated infographic itself is a client subcomponent (`HomeChallengesFlow.tsx`) — pure presentational, no data dependency.

**Fallbacks** — if any DB call fails or counts are zero (fresh deployment), we render rounded stub values (`40+`, `120+ min`, etc.) so the section still looks credible. Counts read from env at build-time as a safety net.

---

## 5. Animation approach

Stay consistent with the rest of the site — **no new dependencies**.

- React state + `setTimeout` driving a shared phase machine (`idle → step1 → step2 → step3 → loop`), same shape as `CodeDemoCard`.
- CSS transitions on transform/opacity for slide/fade effects.
- `IntersectionObserver` to only start the animation loop once the section scrolls into view (prevents the timer running on a homepage tab the user never sees).
- `prefers-reduced-motion` short-circuits the animation to a static "final state" rendering.

Optional later: if scroll-triggered animation gets richer (parallax, gesture-driven swap), introduce `framer-motion` — but **not in v1**, to keep the bundle lean.

---

## 6. File structure

```
src/app/
├── HomeChallenges.tsx              # server, fetches stats, renders shell + StatsRow
├── HomeChallengesFlow.tsx          # client, the 3-card animated infographic
└── HomeChallengesStats.tsx         # client (just for hover effects), receives stats props
```

Single responsibility per file, mirrors the `HomeBento` / `HomeBento.tsx` pattern already in place.

---

## 7. Phased rollout

**Phase 1 — Static skeleton + stats (small PR)**
- New server component with headline, static-state version of the 3 flow cards (no animation, just final state), and the live stats row wired to Prisma.
- Acceptance: section renders on `/`, shows real counts, looks good at desktop + mobile.

**Phase 2 — Animations**
- Wire the shared phase machine into `HomeChallengesFlow`.
- Add IntersectionObserver gating + reduced-motion fallback.
- Acceptance: section auto-plays once visible, loops gracefully, never janks layout (reserve heights).

**Phase 3 — Polish**
- Hover-pause on flow cards.
- Tooltip on stat cards ("click to filter challenges by easy" → deep-links to `/challenges?difficulty=easy`).
- Loading-state shimmer if any prisma call exceeds 100ms (rare, but defensive).

Phases 1 and 2 are the must-haves; phase 3 is nice-to-have.

---

## 8. Design notes (for review)

- **Color rhythm** — alternate accent placement with HomeBento above so the eye keeps moving (HomeBento leads with the yellow code-demo card on left; HomeChallenges should lead with a non-accent card on the left to avoid two yellow blocks stacked).
- **Card heights** — the 3 flow cards must be equal height; reserve a `min-h` to prevent collapse during the cycle. Same trick as the typing code area in `CodeDemoCard`.
- **Mobile** — flow cards stack vertically; the connecting arrows rotate 90° and become down-arrows. Stats row becomes 2x2.

---

## 9. Open questions (please confirm before Phase 1)

1. **Section title** — is `"More than a sandbox. A full interview engine."` the right framing, or would you prefer something narrower like `"Practice with purpose"` / `"From challenges to job offers"`?
2. **Difficulty bar in stats** — show as a horizontal stacked bar (visual) or as three side-by-side mini-stats (`12 easy · 18 medium · 9 hard`)?
3. **Interviews-run counter** — is the total count public-safe, or should we show "1,200+ run" rounded to avoid leaking exact platform usage?
4. **Placement** — confirm `between TrustLogos and HomeExplore` is right. Alternative: directly under HomeBento (before TrustLogos) so the "feature" story finishes before the social proof.
5. **Phase 1 only, or all phases in one PR?** — I'd recommend shipping Phase 1 alone for fast review, but happy to bundle.

---

## 10. Out of scope

- Authenticated personalization (e.g. "challenges you haven't tried"). The section stays the same for all visitors — personalization belongs in the dashboard, not the marketing page.
- A/B testing infrastructure. We can add later if conversion telemetry warrants.
- Embedding the section on other pages (`/challenges`, `/interview/new`). Out of scope here.

---

**Next step:** review this plan, answer the open questions in §9, and confirm whether to start with Phase 1 only or bundle phases.

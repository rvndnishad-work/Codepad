# Homepage Scroll Animations — Architecture Plan

Apple-style scroll-linked + reveal animations for the Codepad homepage. The goal is to feel **deliberate, smooth, and restrained** — not "everything moves on scroll." Three to four signature moments do the heavy lifting; the rest are quiet reveal-in-viewport patterns.

---

## 1. Design principles (the rules)

Borrowed from how Apple actually does it:

1. **Restraint over abundance.** Animate ~25% of elements. The eye lands where motion is — too much motion is noise.
2. **Scroll-linked > scroll-triggered.** Linking an element's state to scroll *position* (not just "scroll past this and play") creates the "I'm in control" Apple feel. Reserve scroll-linked for signature moments.
3. **Transform & opacity only.** Anything else triggers layout/paint and kills 60fps on mid-range devices.
4. **Easing is the magic.** Linear is for code-debug; everything user-facing uses a tight cubic-bezier (`cubic-bezier(0.16, 1, 0.3, 1)` — the "expo out" used in iOS).
5. **Reduced-motion is non-negotiable.** Every animation gates on `prefers-reduced-motion`.
6. **Above-the-fold doesn't wait.** No reveal animations on the hero — content paints immediately, parallax kicks in only as the user scrolls.

---

## 2. Tech choice

| Approach | Bundle (gzip) | DX | Browser Support | Power | Verdict |
|---|---|---|---|---|---|
| **Framer Motion** | ~50 KB | Excellent React-native API; `useScroll`, `useTransform`, `motion.*` primitives | All evergreen | High | **Pick this** |
| Pure CSS `animation-timeline: scroll()/view()` | 0 KB | Declarative, no JS | Chrome 115+ only (Firefox/Safari pending) | Medium | Layer in later as progressive enhancement |
| GSAP + ScrollTrigger | ~30 KB | Excellent | All | Highest (Apple actually uses this on apple.com) | Overkill + license complexity |
| `IntersectionObserver` + CSS transitions | 0 KB | Manual; lots of boilerplate | All | Low–Medium (no scroll-linked) | Already in use for `HomeChallengesFlow`; keep for cheap reveals |
| Custom scroll listener + RAF + CSS vars | 0 KB | High effort | All | High | Don't reinvent |

**Decision: Framer Motion as the primary, IntersectionObserver kept where it already works.** Bundle cost is real but the homepage is already a client-heavy marketing surface; we get scroll-linked transforms for free with a battle-tested API. We dynamic-import it on the homepage only so admin/dashboard/playground bundles are unaffected.

```ts
// src/app/page.tsx — keep server. The animated subcomponents are client.
const ScrollHero = dynamic(() => import("./HomeHeroScroll"), { ssr: true });
```

If Framer Motion's bundle becomes a real measured problem (Lighthouse < 90), we drop to a `motion-mini` subset or rewrite the 3 signature moments in vanilla `useScroll`-equivalent hooks (~150 lines).

---

## 3. The four signature moments (high-impact, scroll-linked)

These are the "Apple moments" — moments worth the implementation cost. **Build these first, ship nothing else if budget gets tight.**

### Moment 1 — Hero parallax + fade

[src/app/HomeHero.tsx](src/app/HomeHero.tsx) — title and eyebrow translate up slightly faster than the page (50–80px over the scroll distance), opacity fades to 0 as the section leaves the viewport. The CTA buttons hold position longer (parallax depth: front layer moves least). Gives the hero a "stage lights dimming" effect as you scroll past.

**Scroll input**: section's `top` from 0 → -100vh
**Transforms**: title `translateY` 0 → -80px, `opacity` 1 → 0; eyebrow follows at 0.6× rate; CTAs follow at 0.4× rate.

### Moment 2 — `HomeChallenges` flow as a pinned scroll-story

This replaces the current auto-loop in [src/app/HomeChallengesFlow.tsx](src/app/HomeChallengesFlow.tsx). The section becomes **sticky for ~200vh of scroll**, and the active step advances based on scroll progress — `0–33% → step 1`, `33–66% → step 2`, `66–100% → step 3`. As the user scrolls, they watch the story unfold instead of waiting for the auto-cycle.

Why this works for Apple-style: the user controls the pace. They can scrub forward and back. It's the most "story" we can wring out of three cards.

**Fallback**: if scroll feels janky, keep the existing auto-loop but trigger it once when in view (no infinite cycle). Auto-loop in the background is a polish bug, not a feature.

**Cost**: medium — requires `useScroll({ target, offset })` from Framer Motion and replacing the existing phase-machine `useEffect`.

### Moment 3 — Number tickers in the stats strip

[src/app/HomeChallenges.tsx:101-121](src/app/HomeChallenges.tsx:101) — the four stat cards (`40+ Challenges`, `1h+ Practice`, `1+ Interviews`, difficulty bar). Numbers count up from 0 to their final value over ~1.5s when the strip enters the viewport. The difficulty bar's three segments grow from `width: 0%` to their proportions on the same trigger.

**Trigger**: IntersectionObserver `threshold: 0.4`. Plays once.
**Tween**: Framer Motion `animate({ count: 0, to: target })` with `easeOut`.

### Moment 4 — `HomeFinalCTA` letter reveal

[src/app/HomeFinalCTA.tsx](src/app/HomeFinalCTA.tsx) — `"Bring your ideas to life."` reveals word-by-word (not letter-by-letter — letter would feel gimmicky). Each word fades up on a 60ms stagger. The button below scales in last.

This is the dramatic close — give it room. Eyebrow text → headline reveal → subtext → button, all in ~700ms total when the section enters view.

---

## 4. Reveal patterns (cheap stagger fades — apply broadly)

For everything that's not a signature moment, use one consistent reveal: `translateY(24px) → 0, opacity 0 → 1`, duration 600ms, ease `cubic-bezier(0.16, 1, 0.3, 1)`, stagger 80ms when in a group.

A single shared `<RevealOnScroll>` wrapper handles this — one component, used everywhere.

**Apply to:**
| Element | File | Stagger group? |
|---|---|---|
| 3 feature cards (Instant Spin-up / Secure Sandbox / Pro Sharing) | [HomeBento.tsx:347](src/app/HomeBento.tsx:347) | Yes (80ms) |
| Engine + PRO side cards | [HomeBento.tsx:321](src/app/HomeBento.tsx:321) | Yes (120ms) |
| Popular Starters grid | [HomeBento.tsx:366](src/app/HomeBento.tsx:366) | Yes (60ms) |
| HomeExplore section heading | [HomeExplore.tsx:23](src/app/HomeExplore.tsx:23) | No |
| HomeExplore 6 cards | [HomeExplore.tsx:37](src/app/HomeExplore.tsx:37) | Yes (60ms) |
| HomeChallenges eyebrow / headline / subtitle | [HomeChallenges.tsx:84-94](src/app/HomeChallenges.tsx:84) | Yes (100ms) |
| HomeChallenges dual CTAs | [HomeChallenges.tsx:124](src/app/HomeChallenges.tsx:124) | Yes (80ms) |
| Blog hero card | [page.tsx:212](src/app/page.tsx:212) | No |
| Blog grid items | [page.tsx:226](src/app/page.tsx:226) | Yes, lazy-feed handles its own |

**Skip the wrapper on:**
- Below-the-hero **first paint** — the visible content above-the-fold doesn't reveal, it just appears.
- The `CodeDemoCard` in HomeBento — it already animates itself; double-up would be noise.
- Admin/dashboard surfaces — keep marketing animations off internal tools.

---

## 5. What NOT to animate (anti-patterns)

These are calls I'd push back on if asked:

- **Parallax backgrounds with images at different speeds.** Dated 2014 aesthetic, easy to do badly.
- **Animated counters on the `HomeBento` "Sandpack v2" / "PRO" cards.** They're static brand statements, not metrics. Animating them implies they're changing.
- **Scroll-jacked sections** — sections that take over scroll velocity. Always feels broken. Never do this.
- **Animating the existing typing demo in CodeDemoCard.** It runs its own state machine; adding scroll-linked state would fight with it.
- **Header bar transformations.** The header is already simple; animating it on scroll past the hero (e.g., shrinking the logo) adds reflows and disorients keyboard users.
- **`HomeFinalCTA` parallax on a marquee-style banner.** The letter reveal is enough drama for this section.

---

## 6. Performance budget

Targets:
- **Lighthouse Performance ≥ 90** on desktop, ≥ 80 mobile.
- **CLS < 0.05.** All animations from `translateY`/`opacity` only — no layout-shifting properties (avoid animating `height`, `width`, `margin`, `top`).
- **Initial JS payload increase < 30 KB gzipped.** Framer Motion's full bundle is ~50 KB; we'll dynamic-import only the homepage entry, and tree-shake to `motion`, `useScroll`, `useTransform`, `useReducedMotion`, `AnimatePresence`.
- **No `will-change` outside active animation windows.** Set it via Framer Motion's lifecycle (added during animation, removed after) rather than as a permanent CSS rule — `will-change` always costs memory.
- **IntersectionObserver gating on every long-running animation.** No animation loop runs while the section is offscreen.
- **One scroll listener total.** Framer Motion shares a single listener internally; don't add ad-hoc `addEventListener("scroll")` anywhere else.

---

## 7. Accessibility

- **`useReducedMotion()` everywhere.** When true, all reveals become 0ms fades (or no animation), parallax is disabled, pinned sections become standard flow, ticker numbers jump to final value.
- **Focus rings unaffected.** Animations must not mask `:focus-visible` outlines — `motion.div` retains DOM focus.
- **Keyboard scrolling parity.** Page Down / arrow keys should produce the same scroll-linked progression as a trackpad. Test it.
- **Don't animate elements off-screen via translate beyond the viewport** — screen readers still announce them and keyboard users can still focus them. Use `aria-hidden` if an element is purely decorative during transition.

---

## 8. File-level structure

New files (small, focused):

```
src/components/scroll/
├── RevealOnScroll.tsx       // The single shared fade-up wrapper used everywhere
├── HeroParallax.tsx         // Wraps HomeHero content with scroll-linked transforms
├── PinnedFlow.tsx           // Sticky 200vh container for HomeChallengesFlow
├── CountUp.tsx              // Number ticker used by the stats strip
└── motion-config.ts         // Shared easing curves, durations, useReducedMotion proxy
```

Touched files:
- [src/app/HomeHero.tsx](src/app/HomeHero.tsx) — wrap title/eyebrow/CTAs in `<HeroParallax>` layers
- [src/app/HomeBento.tsx](src/app/HomeBento.tsx) — wrap card grids in `<RevealOnScroll stagger={...}>`
- [src/app/HomeExplore.tsx](src/app/HomeExplore.tsx) — wrap heading + card grid
- [src/app/HomeChallenges.tsx](src/app/HomeChallenges.tsx) — wrap headline group, stats use `<CountUp>`
- [src/app/HomeChallengesFlow.tsx](src/app/HomeChallengesFlow.tsx) — replace phase-machine with `useScroll`-driven step state inside `<PinnedFlow>`
- [src/app/HomeFinalCTA.tsx](src/app/HomeFinalCTA.tsx) — split headline into words for stagger reveal

No backend changes. No schema changes.

---

## 9. Phased rollout

Three independently-shippable phases. Each is mergeable on its own; each adds value even if the next never lands.

### Phase 1 — Reveal foundation (low risk, high reach)
- Add `RevealOnScroll` component + `motion-config.ts`
- Wrap every card group flagged in §4
- Wire `useReducedMotion` everywhere
- **Ship gate**: Lighthouse perf ≥ 90; CLS unchanged

### Phase 2 — Signature moments
- Hero parallax (`HeroParallax.tsx`)
- `HomeFinalCTA` word-reveal
- Stats `CountUp`
- **Ship gate**: motion feels intentional in a side-by-side A/B at the office

### Phase 3 — Pinned flow story
- Replace `HomeChallengesFlow` phase machine with scroll-pinned story
- Most invasive change; worth its own PR with a video attached
- **Ship gate**: scrubbing back/forth works on trackpad, mouse wheel, keyboard, and touch

---

## 10. Open questions

Before I touch code:

1. **Bundle tolerance** — is +30 KB gzipped on the homepage acceptable? If hard no, Phase 3 stays but Phase 1 + 2 drop Framer Motion in favor of pure CSS + IntersectionObserver (more code, less power, no scroll-linking for hero parallax).
2. **Pinned flow length** — 200vh of pinned scroll feels right to me, but it does extend the homepage's total scroll depth meaningfully. Cap at 150vh? Skip pinning and use plain scroll-linked color/highlight on the cards instead?
3. **Keep the existing auto-loop?** If Phase 3 ships, the auto-loop becomes dead code. If Phase 3 *doesn't* ship, the auto-loop continues to animate even when offscreen (covered partly by IntersectionObserver gating but still a UX nit). Recommend killing the auto-loop in Phase 1 and letting cards just sit in their final state until Phase 3 lands.
4. **Mobile** — pinned scroll sections feel different on mobile (smaller viewport = less room for the story). Recommend disabling Phase 3's pinning on `< md` and falling back to a swipe-through carousel for the three steps. Confirm?

---

## 11. Out of scope

- 3D / Canvas / Three.js scenes
- Reading-progress bars / chapter trackers
- Cursor effects (custom cursors, magnetic hover)
- Page-load splash screens
- Inter-page transitions (would need view transitions API + routing rewrite)

---

**Next step**: review this plan, answer the four open questions, then I'll start with Phase 1 (the reveal foundation) — that's the cheapest first ship and unblocks the rest.

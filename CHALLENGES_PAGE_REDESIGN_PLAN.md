# `/challenges` Page Redesign — Review & Plan

A focused critique of the current page and a proposed redesign with infographics + better content arrangement.

---

## 1. What's there now

[src/app/challenges/ChallengeList.tsx](src/app/challenges/ChallengeList.tsx) renders:

1. Small **hero strip** — target icon, "Practice / Challenges" title, a `5/40 Solved` stat tucked top-right.
2. One-line subtitle.
3. **Search input** + result count.
4. **Difficulty pills**: All / Easy / Medium / Hard.
5. **Tag chip wall** — every tag from every challenge, flat list.
6. **List of rows** — `[status dot] [title + category] [tags] [difficulty] [time]`, all challenges in one long flat list, sorted by difficulty then creation date.

---

## 2. Honest critique

What's not working:

- **No visual hierarchy.** Every row looks identical. The eye has nowhere to land first.
- **Tiny stats.** The `5/40 Solved` is the only number on the page; everything else is text. A challenges page is implicitly about *progress* — we should celebrate it.
- **Tag wall is overwhelming.** Showing every tag inline as a horizontal chip strip is noisy and gets ugly fast as the catalog grows.
- **No grouping.** A 40-row flat list is fine; a 200-row flat list won't be. The structure doesn't scale.
- **No personalization for signed-in users** beyond the one stat. No "up next," no streak, no "your weakest difficulty."
- **No discovery surface.** No way to call out staff-picked, popular, or new challenges.
- **Mobile loses tags** entirely (`hidden md:flex`), and the row layout becomes cramped.
- **Filters are limited.** No category filter, no sort options, no "hide solved" toggle.

What *is* working and should stay:
- The status icons (Circle/Flame/Check/X) are scannable.
- The difficulty pills + accent-glow active state.
- The empty state.
- Sub-second client-side filtering.

---

## 3. Proposed redesign

### 3.1 New header — `ChallengesHero`

Replace the small strip with a richer header that does double duty as an infographic.

```
┌─────────────────────────────────────────────────────────────────────┐
│  PRACTICE                                                            │
│  ┌────────────────────────────┐                                      │
│  │  Challenges                │       [hero illustration / glow]     │
│  │  Sharpen interview chops…  │                                      │
│  └────────────────────────────┘                                      │
│                                                                      │
│  ┌──────────┬──────────┬──────────┬──────────┐                      │
│  │   40+    │ 3 / 2 / 1│  720m+   │  12 / 40 │   ← stats strip      │
│  │ Curated  │ Difficulty│ Practice │  Solved  │     (4 cards,        │
│  │ problems │  mix bar │  content │  (signed) │     reuses pattern   │
│  └──────────┴──────────┴──────────┴──────────┘   from homepage)     │
└─────────────────────────────────────────────────────────────────────┘
```

- Reuses the **exact `StatCard` + `DifficultyCard` + `CountUp` + `SpotlightGroup` pattern** already shipped in `HomeChallenges` — no new components, just composition.
- For signed-in users, the 4th card morphs into a **personal progress** card: `12 / 40 Solved` + a small horizontal progress bar broken into easy/med/hard segments (mirrors the existing `DifficultyCard` design language).
- For anon users, the 4th card is `1+ Interview sessions run` like on the homepage — consistent across surfaces.

### 3.2 Toolbar — `ChallengesToolbar`

A single sticky-on-scroll bar combining what's currently three separate strips:

```
[ 🔍 Search title, tag, category… ]  [All|Easy|Med|Hard]  [Category ▾]  [Sort ▾]  [☐ Hide solved]
```

- **Categories as a dropdown** instead of a wall — the current `category` field (e.g. "Algorithms", "Frontend") finally gets used.
- **Sort options**: Difficulty (default), Most popular (by attempts), Recently added, Estimated time.
- **"Hide solved"** toggle for signed-in users.
- **Tags moved out of the toolbar** — they appear only inside each challenge card now. Discoverable, not domineering.

### 3.3 Main grid — `ChallengesGrid`

Replace the flat list with a **2-column responsive card grid** (1 col on mobile, 2 on md+, optionally 3 on xl):

```
┌────────────────────────────┐  ┌────────────────────────────┐
│ ✓  Two Sum         [EASY]  │  │ ○  Anagram Detect  [EASY]  │
│ ALGORITHMS · 15 min        │  │ ALGORITHMS · 20 min        │
│ #arrays #hashmap           │  │ #strings                   │
│ ⚡ 234 attempts            │  │                            │
└────────────────────────────┘  └────────────────────────────┘
```

- Each card has the spotlight glow on hover (reuses `SpotlightGroup` / `SpotlightCard`).
- Status icon stays as the dominant left-anchor.
- Tags now live inside the card (max 3 visible + "+2 more" if needed).
- A small "attempts" or "freshness" line replaces the all-tag-wall problem (only shown for signed-out users or when meaningful).
- Difficulty badge top-right, time on the bottom.

### 3.4 Section grouping (NEW)

By default, group cards into **sections by difficulty** with a thin sticky-when-scrolling section header:

```
EASY (18)            ▮▮▮▮▮▮▯▯▯▯  5/18 solved
[card] [card] [card] [card] …

MEDIUM (16)          ▮▮▮▯▯▯▯▯▯▯  3/16 solved
[card] [card] [card] …

HARD (6)             ▮▯▯▯▯▯▯▯▯▯  1/6 solved
[card] …
```

- Each section header has a mini progress bar showing personal solve rate at that difficulty.
- When a difficulty filter is active (e.g. "Easy"), only that section renders — same code path, no special-case.
- Same idea works for category groupings if user picks Sort: by category later.

### 3.5 Sidebar — `ChallengesProgressSidebar` *(signed-in only, lg+ desktop)*

On `lg` and up, add a 280px right rail:

- **Donut**: Solved breakdown by difficulty (visual version of the stats strip).
- **Up next**: a single suggested challenge — the next unsolved at user's strongest difficulty.
- **Streak**: days-in-a-row attempted (if we track this; cheap to add).
- **Tag cloud** *(small, ranked by frequency)* — replaces the current tag wall.

On smaller screens, the sidebar content collapses into an "Your progress" accordion at the top of the page.

---

## 4. New components

```
src/app/challenges/
├── page.tsx                          (server, fetches + passes data)
├── ChallengesHero.tsx                NEW — header + stats strip
├── ChallengesToolbar.tsx             NEW — search + filters + sort
├── ChallengesGrid.tsx                NEW — sectioned card grid
├── ChallengeCard.tsx                 NEW — single card
├── ChallengesProgressSidebar.tsx     NEW — desktop right rail
└── ChallengeList.tsx                 DELETE after migration
```

Reuses: `StatCard`, `DifficultyCard`, `CountUp`, `SpotlightGroup`, `SpotlightCard`, `RevealOnScroll` — all already shipped. Net new visual surface ≈ 5 small files.

---

## 5. Data needs

The current Prisma query already returns everything except **attempt counts** (for the "popular" sort + "234 attempts" footer line). One added aggregation:

```ts
prisma.challengeAttempt.groupBy({
  by: ["challengeId"],
  _count: true,
});
```

Then merge into the items map before rendering. No schema changes.

Optional for streaks: read `ChallengeAttempt.startedAt` for the signed-in user and count consecutive days — small adder.

---

## 6. Phased rollout

Three independently shippable PRs:

**Phase 1 — Header + stats infographic** *(cheapest first ship)*
- Replace small hero strip with eyebrow + headline + the 4-card stats strip + spotlight glow.
- Personal progress card morphs in for signed-in users.
- No grid changes yet — current flat list stays beneath.

**Phase 2 — Grid + sectioning**
- Convert flat list to sectioned card grid (`ChallengesGrid` + `ChallengeCard`).
- Move tags into cards.
- Add category dropdown + sort options to toolbar.

**Phase 3 — Sidebar + popularity data**
- Add desktop progress sidebar (donut, up-next, tag cloud).
- Wire attempt counts into popularity sort + the "234 attempts" line.

---

## 7. What I'd push back on if asked

- **Don't add a leaderboard.** Coding-challenge leaderboards quickly become gameable and discourage casual users. Personal progress beats public ranking on a practice surface.
- **Don't add multiselect tag chips.** One category + one difficulty + freeform text search is plenty — adding tag multiselect makes the toolbar a control panel.
- **Don't gamify with streak fire emojis.** Streak number is fine; flame-icons-everywhere is not. (One subtle flame in the sidebar header is the cap.)
- **Don't add a calendar heatmap (GitHub-style).** Premature for the data we have — most users will have empty calendars and feel bad.

---

## 8. Open questions

1. **Default grouping**: difficulty (recommended) or category? Difficulty is more universal; category requires we always have good category data.
2. **Sidebar threshold**: enable at `lg` (1024px+) or `xl` (1280px+)? `lg` reaches more users; `xl` gives breathing room.
3. **Card density**: 2-column grid (recommended — readable) or 3-column on xl (denser)? I'd start with 2 and only add 3-col if the catalog grows past ~30 visible items.
4. **Phase 1 only, or all three in one shot?** Phase 1 alone is ~half a day's work and delivers the biggest visual upgrade. Phase 2 + 3 are larger and benefit from review between.

---

**Next step**: answer the four questions, and I'll start Phase 1.

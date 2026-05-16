# Challenge Tracks — Architecture & Rollout Plan

What you described in plain terms:

> Build *groups* of challenges (e.g. "JavaScript series", "React series"), let users author and publish their own, track per-user progress (done/pending), let users stash or remove tracks they're not finishing, and decide whether this lives on the profile or on `/challenges`.

This plan locks down the architectural decisions before any code lands, because the choices here ripple into the schema and four to five different page surfaces.

---

## 1. Naming — call it a **Track**

Three plausible options:

| Name | Pro | Con |
|------|-----|-----|
| **Track** | Universal in learning platforms (Codecademy, Frontend Masters, freeCodeCamp). Short. Translates well. | Slightly generic. |
| Series | Matches your verbal phrasing ("JavaScript series"). | Collides with "TV series" mental model; suggests episodic content. |
| Path | Frontend Masters / Svelte tutorial use this. | Implies a single sequential route; we may want non-linear later. |

**Recommendation: Track.** It's the cleanest noun and pairs well with verbs you already use ("Browse tracks", "Start a track", "Stash this track").

Throughout the rest of this doc I'll use *Track*.

---

## 2. Where it lives — both, with one clear job each

Your question: should it be on the profile or on `/challenges`?

Answer: **both, but each surface does one thing.**

| Surface | Job | What it shows |
|---------|-----|---------------|
| **`/challenges`** | **Discovery** — what tracks exist, what's new, what's featured. | Featured tracks · all tracks · individual challenges below. For logged-in users, a thin **"Continue where you left off"** strip at the top showing 1–3 in-progress tracks. |
| **`/dashboard`** *(or `/profile`)* | **Management** — your active, stashed, completed tracks. | Tabs: Active · Stashed · Completed. Each shows progress bars, last-visited timestamps, resume / unstash / remove actions. |
| **`/tracks/[slug]`** | **Detail page** — the actual track. | Description, ordered list of challenges, your progress, Start / Continue button. |

This split keeps `/challenges` for browsing (where new users land) and `/dashboard` for self-managing what you've committed to. The "Continue" strip on `/challenges` is the bridge: signed-in users see their stuff first, then can scroll into discovery.

**Anti-pattern to avoid**: putting the whole personal-management UI on `/challenges`. It clutters the discovery surface and confuses anonymous visitors about what the page is *for*.

---

## 3. Data model

Three new Prisma models. Zero changes to existing `Challenge` and `ChallengeAttempt` (this is important — Tracks layer on top, they don't replace anything).

```prisma
/// A curated group of challenges. Authored by admin or (later) by users.
model ChallengeTrack {
  id            String   @id @default(cuid())
  slug          String   @unique
  title         String
  description   String   // Markdown
  tagline       String?  // One-liner for cards
  coverImage    String?
  /// "javascript" | "typescript" | "react" | "vue" | "node" | "general" — drives filter chips on /challenges.
  tech          String   @default("general")
  /// JSON-encoded string[] for additional tags.
  tags          String?
  /// "easy" | "medium" | "hard" | "mixed" — overall vibe; per-item difficulty stays on Challenge.
  difficulty    String   @default("mixed")
  published     Boolean  @default(false)
  /// Admin staff-pick flag for the Featured row on /challenges.
  featured      Boolean  @default(false)
  authorId      String?  // null = admin/curated
  author        User?    @relation(fields: [authorId], references: [id], onDelete: SetNull)
  items         ChallengeTrackItem[]
  enrollments   ChallengeTrackEnrollment[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([published, featured])
  @@index([tech, published])
  @@index([authorId])
}

/// Ordered join between a track and the challenges it contains.
/// We use an explicit join model (rather than implicit many-to-many) because
/// we need a `position` column for ordering, and likely a per-item `note` later.
model ChallengeTrackItem {
  id          String    @id @default(cuid())
  trackId     String
  track       ChallengeTrack @relation(fields: [trackId], references: [id], onDelete: Cascade)
  challengeId String
  challenge   Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  position    Int
  /// Optional per-item commentary from the author ("Try without hashmap first").
  note        String?

  @@unique([trackId, challengeId])
  @@index([trackId, position])
}

/// A user's relationship to a track: started, stashed, completed, abandoned.
/// One row per (user, track). Status transitions are user-driven.
model ChallengeTrackEnrollment {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  trackId       String
  track         ChallengeTrack @relation(fields: [trackId], references: [id], onDelete: Cascade)
  /// "active" | "stashed" | "completed" | "abandoned"
  status        String   @default("active")
  startedAt     DateTime @default(now())
  lastVisitedAt DateTime @default(now())
  completedAt   DateTime?

  @@unique([userId, trackId])
  @@index([userId, status])
  @@index([trackId])
}
```

Also need a corresponding `tracks ChallengeTrackItem[]` relation on the existing `Challenge` model — otherwise the Prisma client can't traverse "which tracks include this challenge."

**Why no per-challenge progress row?** We already have `ChallengeAttempt` with `status: passed`. A user's progress through a Track is computed: count `ChallengeAttempt.status = "passed"` where the challenge is in this track, by this user, divided by the track item count. No denormalised counter, no drift. Cheap query, indexed by user+challenge.

---

## 4. Authoring — admin-only in v1, users in v2

You said: "user would also be able to create and publish challenges of single or multiple questions."

I'd push back on opening user authoring in v1, for two reasons:

1. **Surface area**. User-authored tracks need a creator UI, a draft state, an admin moderation queue, an author profile page, and possibly a reporting flow. That's three to four more pages — bigger than the core feature.
2. **Quality control**. The current `/challenges` listing has 5 curated items. Letting anyone publish risks flooding the catalog with thin tracks and tanking discovery quality before the feature has time to prove itself.

**Recommended split:**

- **v1 (this plan)**: Admins create tracks via `/admin/tracks`. Users can enroll, progress, stash, complete. No user authoring.
- **v2 (separate plan)**: Users get a `/tracks/new` page to author. Admin moderation queue. Author profile page.
- **v3 (later)**: Users author individual *challenges* too (not just tracks of existing challenges). This is the biggest one — needs a test sandboxing story so user-written hidden tests can't be malicious.

If you want users authoring on day one, say so and I'll re-cost. But I'd argue v1 first to nail the core enrollment loop.

---

## 5. UI surfaces in detail

### 5.1 `/challenges` (existing, evolves)

Add two new strips above the current challenge list, leaving the rest from Phase 1 of the previous plan intact:

```
┌─────────────────────────────────────────────────────────────────┐
│  HERO (already shipped — eyebrow + title + 4-card stats strip)  │
├─────────────────────────────────────────────────────────────────┤
│  ▶ Continue where you left off       (signed-in, has active)    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │ JS series   │ │ React kata  │ │ Algo warmup │                │
│  │ ▮▮▮▮▯▯  4/6 │ │ ▮▮▯▯▯▯  2/8 │ │ ▮▮▮▮▮▯  5/6 │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
├─────────────────────────────────────────────────────────────────┤
│  ★ Featured tracks                                              │
│  [card] [card] [card]                                            │
├─────────────────────────────────────────────────────────────────┤
│  Browse all tracks                  [tech: All|JS|TS|React|…]   │
│  [card grid …]                                                   │
├─────────────────────────────────────────────────────────────────┤
│  Individual challenges  (the existing list — kept for users who │
│                          want to cherry-pick instead of follow) │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 `/tracks/[slug]` (new)

The detail page for a single track:

- Hero with title, tagline, author chip ("Curated by Interviewpad" or user attribution), tech badge, total time, difficulty mix mini-bar.
- Ordered list of challenges, each showing: position number, title, difficulty, time, your status (✓ passed / ◐ in-progress / ○ unstarted).
- Sticky progress bar at the top while scrolling.
- Primary CTA: "Start track" → first unattempted challenge, or "Continue" → last in-progress.
- Secondary: "Stash for later" / "Remove from my list".

### 5.3 `/dashboard` (new section)

New "Your tracks" widget on the dashboard:

```
Your tracks                                            [Active 3] [Stashed 1] [Completed 2]
┌────────────────────────────────────────────┐
│ JS series        ▮▮▮▮▯▯  4/6   2 days ago  │
│ React kata       ▮▮▯▯▯▯  2/8   yesterday   │
│ …                                          │
└────────────────────────────────────────────┘
```

Tabs filter by `ChallengeTrackEnrollment.status`. Each row links to `/tracks/[slug]`.

### 5.4 `/admin/tracks` (new)

Mirrors the existing `/admin/challenges` and `/admin/snippets` pattern:

- List of all tracks (published + draft), filter by status.
- "New track" button → form: title, slug, tech, difficulty, description, cover image, then a challenge picker (multi-select from existing published challenges, drag-to-reorder).
- Edit page allows reordering items, publishing/unpublishing, featuring on `/challenges`.

---

## 6. Stash / remove semantics

Decision needed: **soft-stash, not delete.**

- **Stash** sets `enrollment.status = "stashed"`. Hidden from "Active" tab, visible in "Stashed". Resumes with one click.
- **Remove** (not delete) sets `enrollment.status = "abandoned"`. Only visible in a collapsed "Cleared" section, never recommended again to this user.
- **Actual delete** is not exposed in the UI. Even abandoned enrollments stay in the DB for analytics; cleanup is admin-only if ever needed.

This matters because losing progress to a misclick is awful UX. Stash is the default action; abandon requires a confirm.

---

## 7. Phased rollout

Three concrete PRs.

### Phase A — Schema + admin authoring + track detail page (1 PR)
1. Prisma migration adding the three new models.
2. `/admin/tracks` list + create/edit forms (mirror existing admin patterns).
3. `/tracks/[slug]` detail page rendering items with per-user status.
4. Seed a few starter tracks (e.g. "JS Warmup", "React Hooks Kata") so the surface isn't empty.

**Ships nothing user-visible on `/challenges` yet.** Tracks exist but aren't promoted on discovery surfaces.

### Phase B — `/challenges` discovery integration + enrollment loop (1 PR)
1. New strips on `/challenges`: "Continue where you left off" + "Featured tracks" + "Browse all tracks".
2. Enrollment API: start, stash, abandon, complete.
3. Track cards with progress bars.
4. Tech filter chips (JS / TS / React / Vue / Node / General) on the track grid.

### Phase C — Dashboard tracks widget + lifecycle polish (1 PR)
1. Dashboard "Your tracks" widget with Active / Stashed / Completed tabs.
2. Track completion celebration (subtle — a toast and an updated stat on the hero).
3. "Last visited" timestamps wired through.
4. Admin "Trends" page already pins snippets; extend to pin tracks too.

**Total scope**: roughly 12–18 files added/changed across three PRs. Each PR is independently shippable and reviewable.

---

## 8. What we're explicitly *not* doing in v1

- User authoring of tracks (v2).
- User authoring of individual challenges (v3 — needs a sandbox story).
- Per-track comments or discussions.
- Public author profiles.
- Track ratings / reviews.
- Certificates or badges on completion.
- Track-level timers or deadlines (Interview Sessions already handle the timed format).
- Track forking / cloning.

Each of these is a real feature, but each is a *separate* feature. Trying to ship them all together is how a 3-week project becomes a 6-month one.

---

## 9. Open questions — please answer before Phase A

1. **Tech taxonomy** — what's the v1 list of tech values? My recommendation: `javascript`, `typescript`, `react`, `vue`, `node`, `algorithms`, `general`. Add/remove?
2. **Stash limit** — cap the number of active tracks per user (e.g. max 5 active, rest auto-stash)? Or unlimited? I'd cap at 5 active to nudge focus.
3. **Track-level difficulty** — auto-derive from constituent challenges (max difficulty wins?), or let the author set it manually? Recommend manual to allow "easy intro but ramps up" framing.
4. **Naming check** — happy with **Track**, or prefer Series / Path / Collection?
5. **Phase A scope** — admin authoring + track detail page only (no `/challenges` surfacing yet), or include discovery strips in Phase A? Recommend the strict split above so we can ship the foundation without touching the homepage of the section.

---

## 10. What I'd push back on if asked

- **"Let users author tracks now."** No. Foundation first, authoring second.
- **"Add a leaderboard for fastest-completed tracks."** Practice surfaces shouldn't compete on speed.
- **"Make tracks paywalled / pro-only."** Maybe later, but the feature should prove value as a freely browsable thing first.
- **"Auto-enroll users into 'recommended' tracks."** No. Enrollment is a deliberate user action; auto-enrollment makes the dashboard feel spammed.

---

**Next step**: answer the five questions in §9 and confirm the v1 scope split. I'll start Phase A as soon as you do.

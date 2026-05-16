# Challenges / Tracks — Architectural Review & Simplification Plan

You asked for a senior-engineer-meets-end-user review of the whole challenge surface. Here it is — honest, opinionated, with a concrete path forward. No code yet; this needs sign-off because the choices here cascade through ~20 files.

---

## 1. The immediate gap you spotted

> "When creating a track, I see we can only select from existing challenge questions, not what I was expecting."

You're right — and it's the single biggest UX gap on the platform today.

Right now:

| Surface | Who can author it |
|---|---|
| **Challenge** (problem with starter code + hidden tests) | Admin only |
| **Track** (ordered group of existing challenges) | Any signed-in user (just shipped) |
| **Snippet** (free-form code, no tests) | Any signed-in user |
| **Blog post** | Any signed-in user (with moderation) |

A user landing on `/dashboard/tracks/new` reasonably expects to write *the questions themselves*. They can't. They can only pick from the ~5 admin-curated Challenges. So the feature is effectively useless for any topic admins haven't covered.

I argued in the earlier plan that user-authored individual challenges was "v3" because of test sandboxing concerns. **That argument was wrong.** The existing Challenge form already accepts arbitrary JS/TS as hidden test code, and Sandpack already runs it inside an iframe sandbox. Adding a user surface for the same flow is no more dangerous than what we already do for admins. I should have caught this.

---

## 2. Bigger issues — as a senior architect

### 2.1 Three overlapping concepts

| Concept | What it is | Differences |
|---|---|---|
| **Challenge** | Problem + starter code + hidden tests | Has the actual code |
| **Track** | Ordered group of challenges | Just metadata + ordering |
| **InterviewSession** | Timed sequence of challenges + share token | Has a clock + read-only "interviewer view" |

From a content-author's perspective these all answer **"give people questions to solve."** Three database tables, three creation flows, three URLs. That's accidental complexity, not essential complexity.

**The cost shows up in:**
- Duplicated forms (`ChallengeForm`, `TrackForm`)
- Duplicated discovery (`/challenges` shows Featured tracks, Browse tracks, *and* individual challenges as three strips)
- Duplicated lookup logic (the attempt page reads track context, but interview-session context is wired separately via `?session=`)
- User confusion: "Is this a challenge or a track? Why does it matter?"

### 2.2 Per-item metadata lives in the wrong place

`hint` and `videoUrl` are on `ChallengeTrackItem` (per-track-per-question), not on `Challenge` itself.

That means:
- Same challenge in two tracks → hint written twice; can drift
- A standalone challenge (no track) → can never have a hint or video at all
- Authors who write a great hint for a problem can't reuse it

**Intuition test**: ask a user "where does the hint for Two Sum live?" They'd say "on Two Sum." Not "on the relationship between Two Sum and this particular track."

The fix is to put `hint` + `videoUrl` defaults on `Challenge` (or its question equivalent), keep the per-item field as an *optional override* for track-specific framing.

### 2.3 Authorship inconsistency

Snippets, blog posts, and tracks can be authored by users. Challenges cannot. There's no architectural reason for this asymmetry — it was just where the line happened to be drawn. From the user's mental model, "I made this thing" should work the same everywhere.

### 2.4 `/challenges` page is doing too much

Today the page renders five distinct strips:
1. Hero with 4-stat infographic
2. Animated "Pick → Solve → Build" flow (HomeChallenges-style)
3. "Continue where you left off"
4. "Featured tracks" + "Browse all tracks"
5. Individual challenges list (the original flat list)

A first-time visitor doesn't know which strip is the entry point. The flat list at the bottom is now half-hidden under three other sections. Either we trust the flat list (and drop most of the strips) or we deprecate it (and commit to the card grid).

### 2.5 Naming overloads

"Challenge" refers to:
- The schema entity (`Challenge` model)
- The route (`/challenges`)
- The user-facing noun ("try a coding challenge")
- The colloquial word *you* keep using for tracks too ("create and publish challange")

The fact that we keep slipping between meanings is a tell. The vocabulary is muddy.

---

## 3. Issues an end user will hit

| # | Symptom | Why |
|---|---|---|
| **E1** | "I want to write my own coding question and share it" — can't | Challenge authoring is admin-only |
| **E2** | "Why are tracks and challenges separate sections?" | Discovery fragmentation |
| **E3** | "I built a track but it has only 1 question — why is it different from a challenge?" | They're not different conceptually; we made them different in the schema |
| **E4** | "I invited someone but they didn't get a notification" | We don't send mail; author copies the link manually |
| **E5** | "My track has the same hint twice" | Hint is per-item, not per-challenge |
| **E6** | "I see Two Sum on the homepage AND inside JavaScript Warmup. Which one do I do?" | Discovery confusion when the same problem is in multiple containers |
| **E7** | "I'm a beginner — where do I start?" | No recommended/onboarding path |
| **E8** | "The challenge page is overwhelming" | Five strips, no clear single CTA |

---

## 4. Three possible directions (recommendation marked)

### Option A — Minimal fix: open Challenge authoring to users (~3 days)

Just close the gap, leave everything else.

- New `/dashboard/challenges/new` and `/dashboard/challenges/[id]/edit`
- Reuse `ChallengeForm` with a `surface` prop (same pattern as `TrackForm`)
- New user-facing API: `POST /api/challenges`, `PATCH/DELETE /api/challenges/[id]`
- Add "Your Challenges" widget to the dashboard
- TrackForm picker gets a "+ Create new challenge" button that pops the challenge form, then auto-adds it to the track

**Pros:** Cheap, immediate value, no schema churn.
**Cons:** Doesn't address the Track-vs-Challenge confusion. Adds a third "create" path to the dashboard (snippet / track / challenge).

### Option B — Collapse Track into Challenge (~1 week) ⭐ **Recommended**

Make a Challenge have 1-to-many ordered **Steps**. A "single-step challenge" is what we have today. A "multi-step challenge" is what Tracks were.

**Schema change** (rename, don't churn data — keep existing tables, just relabel and add a relation):

```prisma
model Challenge {
  // existing fields stay; add:
  steps  ChallengeStep[]   // optional ordered substeps
  // (if `steps` is empty, the Challenge IS the step — backward compat)
}

model ChallengeStep {
  id, challengeId, position
  title, description, starterFiles, testFiles, template
  estimatedMinutes, hint, videoUrl
}
```

The old `ChallengeTrack` + `ChallengeTrackItem` tables migrate into Challenge + ChallengeStep. The old `Challenge` table absorbs its own first/only step's code.

**UI change:**
- One creation flow at `/dashboard/challenges/new`
- Question count toggle: **Single question** (today's challenge) vs **Multi-question series** (today's track)
- Behind the scenes both produce a `Challenge` row; the multi-question one has multiple `ChallengeStep` rows.
- `/challenges` page has **one** card grid showing all challenges; multi-step ones get a small "3 questions" pill.

**Result for the user:** ONE concept, ONE creation flow, ONE listing. The hint/video lives on the step (which is the smallest unit), defaults inherited by the parent if not overridden.

**Pros:** Removes 2-of-3 confusing concepts; matches user mental model; one form; one listing.
**Cons:** Data migration needed; ~15-20 files touched.

### Option C — Nuclear: rename everything to "Quest" (~2 weeks)

Same as Option B but rename `Challenge` → `Quest` to escape the overloaded vocabulary. New routes (`/quests`), new tables, full migration.

**Pros:** Cleanest mental model possible.
**Cons:** Bigger blast radius, link breakage, more SEO disruption, longer freeze. Not worth the disruption if Option B gives you 90% of the win.

---

## 5. Concrete recommendation: Option B, in three phases

### Phase A — schema + dual-mode `ChallengeForm` (1–2 days)
1. Add `ChallengeStep` table; migrate existing Challenge rows so each has exactly one step.
2. Refactor `ChallengeForm` to accept one or more steps (default = one). Each step has its own starter/tests/hint/video.
3. Open `/dashboard/challenges/new` for users. `surface` prop, same shape as `TrackForm`.
4. Public attempt page renders steps in order with a step indicator (1/3 → 2/3 → 3/3).
5. **No UI change yet** to `/challenges` or to Tracks — those still work the old way during the transition.

### Phase B — migrate Tracks into multi-step Challenges (2–3 days)
1. One-off migration script: for each existing `ChallengeTrack`, create a Challenge with N steps mapped from `ChallengeTrackItem`s.
2. Redirect `/tracks/<slug>` → `/challenges/<slug>` permanently.
3. Drop the Track admin/dashboard surfaces.
4. Drop the "Tracks" strips on `/challenges`; everything becomes one card grid.
5. Invitations table renames to `ChallengeInvitation` (or stays generic and points at Challenge).

### Phase C — discovery cleanup (1 day)
1. `/challenges` becomes one card grid with filters (tech / difficulty / featured / mine).
2. Hero strip stays (it's good). Animated infographic becomes a small static "how it works" line, freeing vertical space.
3. "Continue where you left off" becomes a thin row above the grid, not a full strip.
4. Featured cards get a star badge in-grid rather than a separate row.

End state: **one page, one card grid, one creation flow, one detail page.** Hints/videos belong to the step they describe.

---

## 6. What we explicitly drop (or defer)

- The Track concept as a separate URL space. RIP `/tracks`. Permanent redirects in place.
- The `/admin/tracks` page (admins use `/admin/challenges` with the new multi-step UI).
- The animated 3-step infographic on `/challenges` — its job (explaining the flow) was already done by the hero stats + the first card you see.
- Backend mail sending — invitations stay copy-link / mailto / wa.me; that's already shipped.
- User-authored individual *questions inside someone else's series* — only the series author can edit it. Forking is a separate feature, not v1.

---

## 7. Risk list (the things that will bite us)

1. **SEO / shared links**: Anyone who's shared a `/tracks/<slug>` URL needs the redirect to be in place day one. Cheap to add but easy to forget.
2. **Existing `ChallengeAttempt` rows** are keyed by `challengeId`. When we split a Challenge into multiple Steps, do attempts attach to the Challenge or to the Step? Decision: attach to Step (`stepId`). Migration backfills `stepId` for existing attempts.
3. **Enrollment** currently keys on `(userId, trackId)`. Renames to `(userId, challengeId)`. Need to migrate `ChallengeTrackEnrollment` rows.
4. **Invitations** key on `(trackId, email)` → `(challengeId, email)`. Same migration shape.
5. **The seed scripts** (`seed-challenges.ts`, `seed-tracks.ts`) need to merge into one.
6. **TypeScript blast radius**: `prisma.challengeTrack` references across the codebase need to disappear. Roughly 15-20 files.
7. **Dev preview lock** during the prisma generate — we already hit this on Windows; plan to stop the server before running the migration.

---

## 8. What I'd push back on if asked

- **"Just rename Track to Series, don't unify with Challenge."** No — that's makeup over a structural problem. Users will still ask "what's the difference?"
- **"Keep Track but also add user Challenge authoring."** This is Option A. It's the cheapest fix but leaves the three-concepts problem and makes the dashboard's creation menu three items long.
- **"Add a richer invitation flow with email sending."** Out of scope here. The current copy-link / mail / WhatsApp flow works. Mail sending is its own project (Resend / Postmark + email templates + delivery monitoring).
- **"Add ratings / comments / discussions on challenges."** Out of scope — that's a community feature, separate plan.

---

## 9. Open questions — please answer before I start

1. **Option A, B, or C?** I recommend **B**. A is too small; C is too big.
2. **Phase B timing**: do we ship Phase A first, let it bake for a few days, then do Phase B? Or push through? I recommend a 2-3 day gap between A and B so we can fix anything that comes up before the data migration.
3. **`/tracks` redirect**: 301 (permanent) or 308 (preserve method)? I'd go 308 for safety; 301 is more SEO-friendly. Probably 301 since nothing POSTs to `/tracks/<slug>`.
4. **The two seed tracks** (`javascript-warmup`, `algorithms-foundations`): migrate them into multi-step Challenges, or delete and re-seed cleanly? I recommend migrate so we get to exercise the migration script.
5. **Existing FizzBuzz/Two Sum**: they currently sit in both seeded tracks. After Phase B they're still standalone Challenges *and* steps inside the new multi-step Challenges. That's fine — same problem, different containers. Or do we de-duplicate? I recommend leaving as-is; FizzBuzz-the-warmup is allowed to differ from FizzBuzz-the-algo-warmup over time.

---

**Next step**: answer the five questions in §9 and I'll start Phase A.

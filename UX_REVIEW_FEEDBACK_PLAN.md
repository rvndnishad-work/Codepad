# UX Review — Implementation Plan

Self-contained backlog of changes derived from an end-user UX review (candidate + recruiter personas). Each item is written so a developer (or AI agent) with **zero prior context** can pick it up, locate the affected files, and ship it.

## How to read this doc

- **Impact** = expected effect on conversion / clarity / trust.
- **Effort** = rough size: `S` (under 1h), `M` (1–4h), `L` (1+ day).
- Every item lists: **Where** (files), **Current state**, **Change**, **Acceptance criteria**.
- Items are ordered within each tier by recommended sequencing — earlier items unblock or de-risk later ones.

---

## Product context (1-minute summary)

`codepad` (npm name) is shipped as **Interviewpad**, a Next.js 15 / Prisma / NextAuth app that serves two personas from the same domain:

1. **Candidates** — practice coding challenges, accept take-home assignments, join live interviews, maintain a public portfolio at `/u/[id]`.
2. **Recruiters** — create workspaces at `/w/[slug]`, build challenge banks, send take-home invites with expiring tokens, run live multiplayer interviews with proctoring telemetry (tab blur, paste detection, Monaco replay).

User type is set at signup (`userType: "candidate" | "recruiter"`) and used by `src/components/Header.tsx` to filter nav and by `src/app/interview/page.tsx` to fork between two completely different dashboards.

Pricing is per-seat: Free vs $49/seat/month (Growth), billed via Stripe per workspace.

---

# HIGH IMPACT

## H1. Fix brand inconsistency (Codepad ↔ Interviewpad)

**Impact:** High. A candidate clicks an invitation branded "Interviewpad" and lands on a screen that says "Codepad" — directly undermines recruiter trust and looks unfinished.

**Effort:** S (mostly find/replace) + decision on canonical name.

**Where:**
- `src/app/take-home/[token]/page.tsx` — line ~50, hard-coded "Codepad" wordmark on the candidate-facing lobby.
- `src/app/HomeInfographic.tsx` — line ~96, body text "Codepad builds, executes…".
- `src/app/HomeChallenges.tsx` — search for "Codepad".
- `src/app/api/interview/[id]/schedule/route.ts` — appears in email/notification copy.
- `src/app/api/w/[slug]/billing/session/route.ts` — appears in Stripe metadata or success URLs.
- `src/app/interview/[id]/report/page.tsx`
- `src/hooks/useFileSystem.ts`
- `src/components/blog-editor/SlashMenu.tsx`
- `src/components/blog-editor/EditorSurface.tsx`
- `package.json` — `"name": "codepad"` (low priority; only affects local tooling).

**Current state:** 9 files reference "Codepad"; ~54 references to "Interviewpad" elsewhere.

**Change:**
1. Confirm canonical name with product owner. Default to **Interviewpad** (matches header logo, footer, metadata, page titles).
2. Run case-sensitive replace `Codepad` → `Interviewpad` across `src/`. Keep `package.json` as `codepad` (rename later if desired).
3. Verify no logo asset files (`/public/*.svg`, `/public/*.png`) embed the wrong wordmark.

**Acceptance criteria:**
- `rg -i "codepad" src/` returns zero results.
- Take-home lobby logo block reads "Interviewpad".
- Page metadata titles consistent.

---

## H2. Split the homepage hero into a two-persona switcher

**Impact:** High. The hero currently mixes recruiter headline ("Evaluate developers at scale") with a candidate-leaning primary CTA ("Sandbox Playground") and three equal-weight buttons. First-time visitors don't know who the product is for.

**Effort:** M.

**Where:** `src/app/HomeHero.tsx` (entire component).

**Current state:**
- One headline targeting recruiters.
- Three CTAs of equal visual weight: Sandbox Playground / Recruiter Platform / Dashboard (or Sign In).
- Eyebrow text: "Interviewpad Pro & B2B Recruitment Suite".

**Change:**
1. Above the fold, render two persona cards side-by-side (stacked on mobile):
   - **Left card — "Practice for your next interview"**: subtitle about challenges + portfolio. Single CTA → `/challenges` (or `/playgrounds` if signed-out user has no userType).
   - **Right card — "Hire developers, faster"**: subtitle about workspaces + proctoring. Single CTA → `/features`.
2. Persist persona choice in `localStorage` (`ipad.persona = "candidate" | "recruiter"`) so subsequent visits skip the chooser and load the matched hero variant directly.
3. Keep the existing animated grid / spotlight background.
4. If user is already signed in with `userType` set, skip the chooser entirely and show that persona's hero only.

**Acceptance criteria:**
- Logged-out new visitor sees both persona cards; either click leads to a single-funnel landing.
- Signed-in candidate sees only candidate hero with `/challenges` CTA.
- Signed-in recruiter sees only recruiter hero with `/dashboard` CTA.
- Lighthouse mobile score for `/` doesn't regress more than 3 points.

---

## H3. Add a "preview before start" step to the take-home lobby

**Impact:** High. Right now the candidate sees expiration + challenge title; clicking Start presumably begins a timed attempt. Candidates expect to know language, difficulty, expected duration, and test-case shape before committing.

**Effort:** M.

**Where:** `src/app/take-home/[token]/page.tsx` and `src/app/take-home/[token]/StartButton.tsx`.

**Current state:** Lobby shows status + expiration + email. `<StartButton />` immediately transitions the assignment to `ACTIVE` and redirects to `/challenges/{slug}/attempt`.

**Change:**
1. Pull `challenge.difficulty`, `challenge.estimatedMinutes`, `challenge.tags`, and a count of visible (non-hidden) test cases on the server.
2. Render a "What to expect" block above the Start button with:
   - Difficulty pill (easy/medium/hard)
   - Estimated time
   - Languages allowed (read from challenge template)
   - Number of visible test cases (e.g. "8 sample cases + hidden grader cases")
   - One-sentence rules summary (paste detection, tab-focus tracking — disclose what is recorded).
3. Add a small "View sample test case" disclosure that expands the first non-hidden test case input/expected output.
4. Replace `<StartButton />` text "Start Assessment" with "I'm ready — start the timer" so the timer-trigger is unambiguous.

**Acceptance criteria:**
- Candidate cannot start the assessment without scrolling past the rules summary.
- The expand-sample-test interaction does **not** count as start; no DB write happens until Start is clicked.
- Disclosure copy lists all telemetry the platform records (paste, tab blur, keystroke rhythm).

---

## H4. Replace recruiter dashboard marketing sections with action items

**Impact:** High. `src/app/interview/page.tsx` (recruiter branch) shows marketing copy AFTER the user has already converted. The "Live Multiplayer Pipeline" 4-step stepper, "Professional Workspace Integration" feature card, and "Interviewer Systems Check" widget are pure decoration on an internal page.

**Effort:** M.

**Where:** `src/app/interview/page.tsx`, sections starting at lines ~217 (pipeline stepper), ~270 (workspace showcase), ~674 (systems check).

**Current state:** These three blocks render unconditionally for recruiters. They repeat homepage marketing copy.

**Change:**
1. Show the pipeline stepper + workspace showcase **only on empty state** (when `interviews.length === 0`). Once any session exists, replace with an action-item rail:
   - Replays awaiting review (sessions with `status: completed` and no `verdict`).
   - Take-homes expiring in next 24h (`takeHomeAssignment.expiresAt < now + 24h && status in [PENDING, ACTIVE]`).
   - Candidates without a scorecard.
2. Replace the static "Interviewer Systems Check" widget (lines ~674–712) with a real **Workspace Health** widget: ATS integration status (connected/disconnected), billing status (active/past-due/free), seat utilization (X of Y used), pending invitations.
3. Move the Verdict Analytics widget above the session list (it's a glanceable summary, not a footer).

**Acceptance criteria:**
- Recruiter with ≥1 interview no longer sees the 4-step pipeline graphic.
- The systems-check widget reflects real workspace state, not hard-coded checkmarks.
- Empty state still teaches a new recruiter how the product flows.

---

## H5. Replace fake trust signals (footer stats + TrustLogos)

**Impact:** High on credibility. The footer's "0ms Cold Start" and "100% V8 Performance" are implausible. The TrustLogos row lists Next.js / Vercel / Prisma / Sandpack — these are dependencies, not customers.

**Effort:** S.

**Where:**
- `src/components/Footer.tsx` lines 72–87 (stats column).
- `src/app/TrustLogos.tsx` (entire component).

**Change:**
1. Remove the "0ms / 100%" stats column from the footer. Replace with either: (a) compliance badges if any exist (SOC2 in progress, GDPR), or (b) a newsletter signup, or (c) delete the column and let the layout reflow to 3 columns.
2. For `TrustLogos`:
   - If real customer logos exist, ship them. Provide a CMS-driven list via `prisma` (new `BrandLogo` model) or a static `src/lib/customer-logos.ts`.
   - If no customers yet, delete the component entirely (do not render placeholder logos). Remove its `<TrustLogos />` reference in `src/app/page.tsx`.

**Acceptance criteria:**
- Footer no longer shows fabricated performance stats.
- Homepage either shows real customer logos or shows no "trusted by" row.

---

## H6. Ship AI-generated code detection (2026's #1 recruiter pain)

**Impact:** High. The pricing page already lists "AI Proctoring (tab-blurs & pastes)" but doesn't detect LLM-authored solutions, which is the dominant cheating mode in 2026.

**Effort:** L.

**Where:**
- New: `src/lib/proctoring/ai-detection.ts` — heuristics.
- `src/app/admin/attempts/[id]/page.tsx` — surface signal in the replay UI.
- `prisma/schema.prisma` — add `aiSuspicionScore Float?` to `ChallengeAttempt` and `InterviewSession`.
- `src/app/api/snippets/[id]/keystrokes/route.ts` (or wherever keystroke events are persisted).

**Current state:** Telemetry captures paste events and tab blur. No LLM-pattern detection.

**Change:**
1. During an attempt, sample keystroke inter-arrival times. Compute mean + stddev for normal typing vs. burst regions.
2. Flag suspicious patterns: (a) zero-edit single-paste solutions, (b) >40 char/sec sustained typing for >2s (likely streamed paste), (c) idle-then-burst patterns characteristic of LLM round-trips, (d) full-function paste with no incremental edits.
3. Store a 0–100 `aiSuspicionScore` per attempt.
4. Surface on the recruiter replay page as a colored badge with click-through to the specific timeline event(s) that drove the score.
5. Add to the public marketing copy on `/features` as a key differentiator.

**Acceptance criteria:**
- Pasting a 50-line ChatGPT solution into the attempt editor results in a score ≥80.
- Typing the same solution manually over 15 minutes results in a score ≤20.
- The score appears in the workspace replay UI with a legend explaining the signals.
- No false positive when a candidate uses multi-cursor paste of small symbols (e.g. import lines).

---

# MID IMPACT

## M1. Stop hiding `/pricing` and `/features` from logged-in users

**Impact:** Mid. A signed-in candidate may want to evaluate if their employer should buy Interviewpad; a recruiter mid-trial needs to find pricing. Currently both routes are filtered out for any signed-in user.

**Effort:** S.

**Where:** `src/components/Header.tsx` lines 26.

**Current state:**
```ts
if (["/features", "/pricing"].includes(link.href)) return false;
```

**Change:**
- Keep `/pricing` always visible. Move it into the `UserMenu` dropdown for signed-in users to reduce header clutter (so it stays reachable without occupying primary nav).
- Keep `/features` in the header for signed-in **candidates** (they may want to see what their next employer could use) but hide for signed-in recruiters since they're already inside the product.

**Acceptance criteria:**
- Signed-in candidate sees `/features` in main nav, `/pricing` in user menu.
- Signed-in recruiter sees `/pricing` in user menu only.
- Signed-out visitor sees both in main nav (unchanged).

---

## M2. Re-enable `/playgrounds` for recruiters

**Impact:** Mid. Recruiters need ad-hoc whiteboards for unscripted technical discussions ("debug this snippet I'm about to paste"). Currently filtered out at `src/components/Header.tsx:30`.

**Effort:** S.

**Where:** `src/components/Header.tsx` lines 28–32.

**Change:** Remove `/playgrounds` from the recruiter exclusion list. Keep `/explore` excluded (the public snippet feed isn't useful for hiring).

**Acceptance criteria:** Logged-in recruiter sees Playgrounds in nav and can create a snippet.

---

## M3. Add a Starter pricing tier ($19/seat) and an Enterprise tile

**Impact:** Mid. Current pricing is a binary cliff (Free / $49) that misses solo recruiters, boutique agencies, and large orgs needing SSO/SAML/SLA.

**Effort:** M (UI) + L (backend if new Stripe products).

**Where:** `src/app/pricing/PricingClient.tsx`, Stripe product config (env or admin), `prisma` if plan name enum exists.

**Current state:** Two cards (Free Trial, Growth $49) plus an implicit "contact us".

**Change:**
1. Add a **Starter** card between Free and Growth: ~$19/seat/month, 1 workspace, up to 25 candidates/month, no ATS integrations, no API.
2. Add an **Enterprise** card on the right: "Contact us" — SSO/SAML, audit logs, SLA, white-label, dedicated CSM.
3. Add a **billing cadence toggle** (Monthly / Annual — 20% off) above the cards.
4. Add a **feature comparison matrix** below the cards (rows: workspaces, candidates/mo, ATS, replay retention, support SLA, SSO, audit log).

**Acceptance criteria:**
- 4 cards render at the standard breakpoint; collapse to 2x2 grid on tablet, 1-column on mobile.
- Annual toggle reduces displayed price and updates Stripe `priceId` on checkout.
- Comparison matrix is keyboard accessible and screen-reader-friendly.

---

## M4. Rewrite jargon-heavy marketing copy in benefit language

**Impact:** Mid. Copy reads like an engineering spec. Phrases to rewrite (these are the worst offenders):

| File | Current | Suggested |
|---|---|---|
| `src/app/HomeHero.tsx` (eyebrow) | "Interviewpad Pro & B2B Recruitment Suite" | "Coding interviews, without the friction" |
| `src/app/HomeHero.tsx` (subtitle) | "...AI proctoring telemetry" | "...see how candidates think, not just what they ship" |
| `src/app/features/page.tsx` (assess tab) | "Visual weighted test builder supporting standard, hidden, and stress cases" | "Drag-and-drop test cases. We grade. You review the diff." |
| `src/app/features/page.tsx` (integrity) | "Keystroke rhythm analysis catching suspicious automated speed bursts" | "Spot pasted ChatGPT solutions in seconds" |
| `src/app/HomeInfographic.tsx` (intro) | "How it works: zero cloud cost" | (move whole section to `/architecture` — see L7) |
| `src/app/pricing/PricingClient.tsx` (growth card) | "Advanced proctoring, autograders, and teammate subscriptions" | "Everything you need to hire confidently" |

**Effort:** M. Pair with a real copywriter or run all rewrites through a single voice-and-tone pass.

**Acceptance criteria:**
- No public-facing string contains "metered", "telemetry", "warm-standby", "CRDT", or "Sandpack" outside an explicit `/architecture` page.
- A non-technical reader can describe the product in one sentence after reading the hero.

---

## M5. Build company-/role-specific challenge tracks

**Impact:** Mid–High for candidate retention; currently `/challenges` is a flat searchable list.

**Effort:** L.

**Where:** New route `/tracks/[slug]` already exists (`src/app/tracks/[slug]/page.tsx`) — needs curated content + entry surface on the candidate `/interview` view and homepage.

**Change:**
1. Seed 6–10 named tracks: "Frontend (React)", "Frontend (Vue)", "Backend (Node)", "Backend (Python)", "Algorithms — FAANG style", "System design fundamentals", "TypeScript deep-dive".
2. Each track = ordered list of existing challenges + a difficulty curve + an estimated total time.
3. Render a `TrackProgress` widget on the candidate `/interview` view ("3 of 8 complete on Frontend (React)").
4. Surface trending tracks on the homepage candidate hero variant from H2.

**Acceptance criteria:**
- Candidate can open a track, see ordered challenges with completion badges, and resume the next unattempted item.
- Admin can create/edit tracks at `/admin/tracks`.

---

## M6. Daily challenge + streak system

**Impact:** Mid. Gamification hook that brings candidates back.

**Effort:** M.

**Where:** New components on the candidate `/interview` view and `/dashboard`; new DB columns.

**Change:**
1. `prisma/schema.prisma`: add `User.streakCount Int @default(0)`, `User.lastStreakDate DateTime?`.
2. Pick a daily challenge (cron or computed-on-read from a curated pool).
3. On the candidate dashboard, render "Today's challenge" card + current streak with a flame icon.
4. Increment streak when the candidate completes the daily challenge; reset if a UTC day is skipped.

**Acceptance criteria:**
- Streak persists across sessions and devices.
- Completing the daily challenge increments the counter; missing a day resets it (with a one-time "freeze" grace day per week — optional).

---

## M7. Bulk candidate invite via CSV

**Impact:** Mid–High for recruiters running batched campus / pipeline drives.

**Effort:** M.

**Where:** New route `/w/[slug]/take-homes/bulk`, new API `POST /api/w/[slug]/take-homes/bulk`.

**Change:**
1. Drop-zone for CSV (`email,name,challengeSlug,expiresInHours`).
2. Server validates each row, generates assignments, and emails invitations.
3. Show a result table: succeeded / failed / skipped with reasons.

**Acceptance criteria:**
- 100-row CSV processes within 10s and emails are queued (use existing email infra; do not block the response on SMTP).
- Duplicate `(workspaceId, candidateEmail, challengeId)` rows are skipped with a clear reason.

---

## M8. Programmatic SEO landing pages

**Impact:** Mid–High over 3–6 months. Missing entirely today.

**Effort:** M (template) + L (content).

**Where:** New route `/topics/[slug]/page.tsx`.

**Change:**
1. Generate one page per high-volume search intent: `react-interview-questions`, `javascript-coding-test`, `python-coding-interview`, `system-design-interview`, `senior-frontend-interview-questions`, etc.
2. Each page: H1 matching the query, 800–1500 words of original content, an embedded list of relevant challenges, a candidate CTA to start the track and a recruiter CTA to "use these for your next hire".
3. Render `next-sitemap` entries and JSON-LD `ItemList`.

**Acceptance criteria:**
- 20+ topic pages live within sitemap.
- Pages score ≥90 on Lighthouse SEO.
- Each page deep-links into at least one challenge or track.

---

## M9. Mobile hero compaction

**Impact:** Mid. Three stacked CTAs in the hero waste ~250px on mobile before content appears.

**Effort:** S.

**Where:** `src/app/HomeHero.tsx` lines 115–161.

**Change:** After H2 (persona switcher), collapse the persona's secondary actions into a "More options" disclosure on mobile (< 640px). Keep one primary CTA visible above the fold.

**Acceptance criteria:** First viewport on iPhone 13 includes hero headline, subtitle, and one CTA without scrolling.

---

## M10. Email templates + automated reminders for take-homes

**Impact:** Mid. Reduces recruiter operational overhead.

**Effort:** M.

**Where:** Wherever the take-home invite email is sent today (search `prisma.takeHomeAssignment.create` for surrounding mail logic).

**Change:**
1. Add a 24h-before-expiry reminder email job.
2. Add an "expired without start" report email to the recruiter.
3. Workspace-level template overrides (subject + body) editable at `/w/[slug]/settings/email`.

**Acceptance criteria:**
- A pending assignment 24h from expiry triggers a reminder.
- A submitted assignment triggers a recruiter notification.
- Templates honor workspace overrides and fall back to defaults.

---

# LOW IMPACT (polish + quick wins)

## L1. Remove fabricated footer stats

Already covered in H5 — listed here as a standalone quick win if H5 is split: just delete lines 72–87 of `src/components/Footer.tsx`.

**Effort:** S. **Acceptance:** Stat tiles gone.

---

## L2. Add chevron / "Menu" label to mobile nav trigger

**Impact:** Low–Mid for discoverability. Currently the logo doubles as the menu button (`src/components/MobileNav.tsx`), which first-time users won't notice.

**Effort:** S.

**Change:** Add a small `ChevronDown` next to the logo on mobile, or include the word "Menu" in a screen-reader-visible label that's also briefly visible (a 1.5s fade after first mount).

**Acceptance:** Tap target is unchanged but visual affordance is present.

---

## L3. Verdict pill copy consistency

**Impact:** Low. `src/app/interview/page.tsx` uses "Met bar" for `verdict === "success"` — uncommon phrase; "Hired" or "Passed" reads more clearly.

**Effort:** S.

**Where:** All renderings of `slot.verdict`. Search `"Met bar"` and `"Met Bar"`.

**Change:** Replace "Met bar" → "Passed" or "Approved" everywhere candidate-facing. Keep internal `verdict` enum value as `success` (don't migrate DB).

**Acceptance:** No user-facing string contains "Met bar".

---

## L4. Annual billing toggle on pricing

**Impact:** Low individually; bundled with M3 it's free. If shipping standalone:

**Where:** `src/app/pricing/PricingClient.tsx`.

**Change:** Add a `[Monthly | Annual −20%]` segmented control above the pricing cards; bind to a `priceId` map; update the checkout call.

**Acceptance:** Toggling changes displayed prices and the Stripe session uses the matched `priceId`.

---

## L5. Replace "Interviewer Systems Check" static checklist

Covered in H4 step 2 — listing separately because the cleanup can ship even if the rest of H4 doesn't.

**Effort:** S.

**Change:** Delete the static `<ul>` at `src/app/interview/page.tsx` lines ~683–712. Either remove the card entirely or replace with a placeholder containing one real dynamic status (e.g. "Workspace billing: Active").

---

## L6. Move blog hub below primary CTAs on the homepage

**Impact:** Low. Editorial blog block currently competes with conversion CTAs above and below it.

**Effort:** S.

**Where:** `src/app/page.tsx` — reorder JSX. Currently order is: Hero → TrustLogos → Bento → Infographic → Explore → Challenges → Blog → FinalCTA.

**Change:** Move Blog section after `<HomeFinalCTA />` so the primary funnel reads cleanly.

**Acceptance:** Blog appears at the bottom of the page.

---

## L7. Move `HomeInfographic` to a dedicated `/architecture` page

**Impact:** Low for casual visitors, useful for engineering-led buyers and recruitment-side IT review.

**Effort:** S.

**Where:** `src/app/HomeInfographic.tsx` → new `src/app/architecture/page.tsx` (or `/security`).

**Change:** Cut the component from `src/app/page.tsx` and render it as a standalone page reachable from the footer ("How it works"). Add `metadata` for SEO.

**Acceptance:** Homepage is shorter by ~one viewport; new page is linkable and indexed.

---

## L8. GitHub portfolio import

**Impact:** Low for v1, candidate-loved feature.

**Effort:** M.

**Where:** `src/app/profile/portfolio/page.tsx`, new API `POST /api/profile/portfolio/import-github`.

**Change:**
1. OAuth into GitHub (NextAuth already supports it).
2. Fetch the user's pinned public repos.
3. Let the user select up to 6 to attach to their public portfolio at `/u/[id]`.

**Acceptance:** Candidate can import 3–6 repos and they render with description + language + stars on their portfolio.

---

## L9. Slack / Teams webhook notifications

**Impact:** Low–Mid for recruiters; low effort.

**Effort:** M.

**Where:** New workspace setting `/w/[slug]/settings/integrations`, new column `Workspace.slackWebhookUrl`.

**Change:** On `takeHomeAssignment.status: SUBMITTED` or `interviewSession.status: completed`, POST a card to the configured webhook.

**Acceptance:** Adding a Slack webhook URL and triggering a submission posts a message to that channel.

---

## L10. "View sample test case" disclosure on challenge detail page

**Impact:** Low. Reduces candidate anxiety about input/output format.

**Effort:** S.

**Where:** `src/app/challenges/[slug]/page.tsx`.

**Change:** Show the first non-hidden test case's input + expected output in a collapsed `<details>` element above the "Start" CTA.

**Acceptance:** Candidate can expand the test case without starting the timer.

---

## L11. Add real workspace-health badges

**Impact:** Low individually; pairs with H4.

**Effort:** S–M.

**Where:** `src/app/interview/page.tsx` (replacement for "Systems Check"), `src/app/w/[slug]/page.tsx`.

**Change:** Pull `workspace.planName`, `atsIntegration` presence, member count vs seat allowance, and last-30-days session count. Render four real status pills.

**Acceptance:** A workspace with no ATS connected shows "ATS: Disconnected" with a CTA to set it up.

---

## L12. Asynchronous video-recorded questions (one-way interview)

**Impact:** Low for v1 but unblocks a common Q1 hiring funnel.

**Effort:** L. Defer unless customer-asked.

**Where:** New route surface; new `VideoQuestion` + `VideoAnswer` Prisma models.

**Change:** Record candidate webcam answers to recruiter-uploaded prompts. Use the browser MediaRecorder API + S3-compatible storage. Embed playback in the existing replay UI.

**Acceptance:** Recruiter creates a 2-prompt video round; candidate records and submits without installing anything.

---

# Suggested sequencing

If shipping incrementally with one engineer:

**Week 1 (high-trust, low-risk):** H1, H5, L1, L5, L11, M1, M2, M9.

**Week 2 (conversion lift):** H2, H3, L10, L6, L7, M4 (copy pass).

**Week 3 (recruiter retention):** H4, M3, M7, M10, L4.

**Month 2 (differentiation):** H6 (AI detection), M5 (tracks), M6 (streak), M8 (programmatic SEO).

**Backlog:** L8 (GitHub), L9 (Slack), L12 (async video).

---

# Definition of done (applies to every item)

1. Type-checks clean (`npm run build`).
2. Lints clean (`npm run lint`).
3. Verified in a real browser via the project's preview tooling (see `preview_*` workflow) — never claim done from compile alone.
4. No new accessibility regressions (keyboard nav still works on the changed surface).
5. No leftover references to the obsolete copy/UI (grep before opening the PR).

# Staff blog writer

Instructions for the scheduled Claude session that writes one DevPrep blog post per run and opens it as a pull request. A person reviews and merges the PR, then publishes with `npm run seed:blogs -- <slug>`.

## 1. Start from develop

```bash
git fetch origin develop
git checkout -B <your session branch> origin/develop
```

Use the branch name your session was given. Open the PR into `develop`.

## 2. Pick a topic

- List what already exists: `ls prisma/data/blog/`. Never write a second post on a topic already covered; pick a different angle or a different topic.
- Rotate areas run to run. Look at the tags of the three most recent posts (by git log on `prisma/data/blog/`) and pick an area that is not among them:
  - **Frontend:** React, Next.js, browser APIs, CSS, performance, accessibility
  - **Backend:** Node.js, databases and SQL, APIs, system design, caching, queues
  - **AI engineering:** LLM apps, RAG, agents, evals, prompt and context design
  - **Interview craft:** the follow-up questions interviewers ask on a topic, and how to answer them
- Prefer topics a developer preparing for interviews or working on a real product would search for. Something that changed in the last year (a new release, a deprecation, a new API) is a good choice, as long as you can verify it.

## 3. Research

- Use web search for anything tied to a version, release date, default value, benchmark or vendor behaviour. Cite the source inline as a Markdown link. Prefer primary sources (official docs, release notes, the project blog).
- If you can only find a claim in secondary sources, say so in the text ("according to …"). If you cannot verify a claim, leave it out.
- Never present speculation as fact.

## 4. Write the post

Create `prisma/data/blog/<slug>.md`:

```markdown
---
slug: kebab-case-slug
title: A specific, plain title
excerpt: One or two sentences saying what the reader will learn.
tags: ["area", "topic", "subtopic"]
cover: /blog-images/kebab-case-slug/cover.png
---

Opening paragraph...
```

- **Shape:** an opening that says why the topic matters, then `##` sections (never `#`, since the page already shows the title). Where it fits, give each question or idea a one-line short answer in a `>` quote, then the explanation, then code. End with a short cheat-sheet table or summary.
- **Length:** 1,500 to 4,000 words. Depth beats breadth.
- **Plain language:** define every term the first time it is used. No filler, no hype, no "In today's fast-paced world".
- **Markdown only.** The page renders GitHub-flavoured Markdown (tables, lists, code, images). Raw HTML and inline SVG are not rendered, so do not use them; put pictures in image files (next section).
- **Code:**
  - A block marked ```` ```javascript-run ```` gets a Run button on the page. Use it for self-contained browser-safe JavaScript with no imports.
  - Use ```` ```javascript ```` for code that needs Node, imports or flags. If the reader can run it, make its first line `// Run with: node [flags] file.js`.
  - Follow every example you ran with "Output:" and a ```` ```text ```` block holding exactly what it printed.
  - Other languages (Python, SQL, TypeScript) are fine as plain blocks. Run them yourself where you can and quote real output; otherwise do not show an output block.
- **Links:** link to other posts as `/blog/<slug>` only when that file exists in `prisma/data/blog/`. Link to `/interview-question/<slug>` only when the checker can verify the slug (it needs a database with the questions loaded). Otherwise leave internal links out.

## 5. Images

Every post needs a cover and at least one diagram that explains something (a flow, a structure, a before/after), not decoration. Look at `public/blog-images/javascript-senior-interview-follow-up-questions/` for the house style.

- **Draw your own SVGs** in `public/blog-images/<slug>/`:
  - `cover.svg`, 1600×800: the post's theme in a few words plus one simple visual motif. The blog list crops covers to a centred square, so put the motif in the middle (x 400 to 1200) and keep text outside it, on the left or right.
  - One diagram per idea that is easier to see than to read, 960 wide, 400 to 560 tall. Two to six per post.
- **SVG rules** (each one has broken rendering before):
  - Always set `viewBox="0 0 W H"`, plus `width`/`height` equal to W and H.
  - No apostrophes anywhere in the file. Write "does not", "the team", not contractions or possessives.
  - Every `<text>` labels a shape. A summary sentence goes in the Markdown caption, not in the SVG.
  - Leave at least 40 units between unrelated elements, and check that every label fits inside its box. When in doubt, make the canvas bigger.
  - For arrowheads on thick strokes, use `markerUnits="userSpaceOnUse"` with an explicit size, or they scale with the stroke.
  - Style: dark background `#0f1117`, panels `#171a23`, text `#e8eaf0`, muted `#9aa3b5`; accents yellow `#facc15`, blue `#60a5fa`, green `#34d399`, red `#f87171`, purple `#a78bfa`; Inter for text and a monospace font for code.
- **Render and look:**
  ```bash
  npx tsx scripts/render-blog-cover.ts <slug> <preview dir outside the repo>
  ```
  It writes `public/blog-images/<slug>/cover.png` (social previews need a PNG) and a PNG preview of every other SVG. Open every PNG and fix overlaps, clipped text or oversized arrows before going on.
- **Use them:** set `cover: /blog-images/<slug>/cover.png` in the front matter, and put each diagram right after the short answer or paragraph it explains:
  ```markdown
  ![One-sentence caption that says what the picture shows](/blog-images/<slug>/diagram.svg)
  ```
  The alt text is shown as the caption, so make it a real sentence.
- **Public photos** are allowed only from `images.unsplash.com` or `images.pexels.com` (free licences, and the only photo hosts the site allows). Link the image URL directly and credit the photographer in the caption. Never use images from other sites.

## 6. Check

```bash
npm run check:blogs -- <slug>
```

It must print `✔ 1 post(s) passed.` It checks the front matter and the heading levels, that the cover and every local image exist (and SVGs have no apostrophes), runs every runnable example and compares its output with the quoted block, and verifies internal links when a database is reachable. Fix the post until it passes; never edit the quoted output by hand to make it pass.

## 7. Open the PR

- Commit only the new `.md` file and its `public/blog-images/<slug>/` folder (SVGs and `cover.png`; not the previews).
- Title: `Blog: <post title>`.
- Body: a Before/After paragraph, what the post covers in a few bullets, what was verified (examples run, sources checked) and anything left unverified, and the publish command `npm run seed:blogs -- <slug>`.
- Do not run `seed:blogs` yourself and do not connect to any production database.

## 8. Finish

Report the PR link and the post title in one or two sentences. If no topic could be verified well enough to publish, open no PR and say why.

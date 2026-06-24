/**
 * Seed the Interview Questions module with a starter set of companies,
 * questions and experiences. Idempotent (upserts by slug). Run:
 *   npx tsx prisma/seed-interview-questions.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Co = { name: string; slug: string; industry: string; description: string; website: string; roles: string[] };

const companies: Co[] = [
  { name: "Google", slug: "google", industry: "Technology", website: "https://google.com",
    description: "Google's interviews emphasise data structures, algorithms and system design with a strong bar on problem-solving clarity.",
    roles: ["Software Engineer", "SDE II", "Frontend Engineer"] },
  { name: "Amazon", slug: "amazon", industry: "E-commerce / Cloud", website: "https://amazon.com",
    description: "Amazon screens heavily on the Leadership Principles alongside DSA and design rounds.",
    roles: ["SDE I", "SDE II", "Frontend Engineer"] },
  { name: "Meta", slug: "meta", industry: "Social / Technology", website: "https://meta.com",
    description: "Meta focuses on coding speed, product sense and system design, especially for frontend and infra roles.",
    roles: ["Software Engineer", "Frontend Engineer", "Production Engineer"] },
  { name: "Microsoft", slug: "microsoft", industry: "Technology", website: "https://microsoft.com",
    description: "Microsoft interviews blend DSA, low-level design and behavioural rounds across product teams.",
    roles: ["SDE", "SDE II", "Full Stack Engineer"] },
  { name: "Netflix", slug: "netflix", industry: "Streaming", website: "https://netflix.com",
    description: "Netflix favours senior, high-context engineers; expect deep system design and culture-fit conversations.",
    roles: ["Senior Software Engineer", "Backend Engineer"] },
];

type Q = {
  title: string; slug: string; description: string; answer: string;
  company?: string; technology?: string; role?: string; difficulty: string;
  round?: string; experienceLevel?: string; tags: string[]; years: number[];
};

const questions: Q[] = [
  { title: "Explain the virtual DOM and how React uses it", slug: "react-virtual-dom-explained",
    description: "What is the virtual DOM, and how does React use diffing/reconciliation to update the UI efficiently?",
    answer: "The **virtual DOM** is an in-memory tree of React elements. On state change React builds a new tree and *diffs* it against the previous one (reconciliation), computing the minimal set of real-DOM mutations to apply. Keys help it match list items across renders.",
    company: "Meta", technology: "reactjs", role: "Frontend Engineer", difficulty: "easy", round: "Frontend", experienceLevel: "mid", tags: ["react", "frontend", "dom"], years: [2023, 2024] },
  { title: "How does the Node.js event loop work?", slug: "nodejs-event-loop",
    description: "Walk through the phases of the Node.js event loop and where microtasks fit.",
    answer: "The event loop has phases: **timers → pending callbacks → poll → check (setImmediate) → close**. Microtasks (`process.nextTick`, Promise jobs) run between phases. This single-threaded loop offloads I/O to libuv's thread pool.",
    company: "Amazon", technology: "nodejs", role: "Backend Engineer", difficulty: "medium", round: "DSA", experienceLevel: "mid", tags: ["node", "event-loop", "async"], years: [2022, 2024] },
  { title: "Design a URL shortener (TinyURL)", slug: "design-url-shortener",
    description: "Design a scalable URL shortening service. Cover the API, storage, and how you generate short codes.",
    answer: "Generate a short code via base62 of an auto-increment id or a hash + collision check. Store `code → longUrl` in a KV/SQL store, cache hot reads, and shard by code. Add analytics asynchronously. Discuss read:write ratio (heavy read) and 301 vs 302.",
    company: "Google", technology: "system-design", role: "SDE II", difficulty: "hard", round: "System Design", experienceLevel: "senior", tags: ["system-design", "scalability"], years: [2021, 2023, 2024] },
  { title: "Find the kth largest element in an array", slug: "kth-largest-element",
    description: "Given an unsorted array, return the kth largest element. Discuss time complexity.",
    answer: "Use a **min-heap of size k** (O(n log k)) or **Quickselect** (avg O(n)). Quickselect partitions around a pivot and recurses into the side containing the kth index.",
    company: "Amazon", technology: "dsa", difficulty: "medium", round: "DSA", experienceLevel: "mid", tags: ["dsa", "heap", "arrays"], years: [2022, 2023, 2024] },
  { title: "What is useMemo and when should you use it?", slug: "react-usememo",
    description: "Explain useMemo, its trade-offs, and when it actually helps.",
    answer: "`useMemo` caches a computed value between renders keyed by its deps, avoiding expensive recomputation. Only worth it for genuinely costly work or to stabilise referential identity for child memoization — overuse adds memory + comparison overhead.",
    company: "Meta", technology: "reactjs", difficulty: "medium", round: "Frontend", experienceLevel: "mid", tags: ["react", "performance", "hooks"], years: [2024] },
  { title: "Explain database indexing and B-trees", slug: "database-indexing-btrees",
    description: "How do indexes speed up queries, and why are B-trees used?",
    answer: "An index is a sorted auxiliary structure mapping column values to row locations, turning O(n) scans into O(log n) lookups. **B-trees** keep data balanced and shallow with high fan-out, minimising disk reads; great for range queries.",
    company: "Microsoft", technology: "system-design", difficulty: "medium", round: "Low-Level Design", experienceLevel: "mid", tags: ["databases", "indexing"], years: [2023] },
  { title: "Debounce vs throttle — implement debounce", slug: "javascript-debounce-throttle",
    description: "Difference between debounce and throttle, and implement debounce.",
    answer: "**Debounce** delays execution until activity stops; **throttle** caps execution to once per interval. Debounce: `const debounce=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}`.",
    company: "Netflix", technology: "javascript", difficulty: "medium", round: "Frontend", experienceLevel: "senior", tags: ["javascript", "performance"], years: [2022, 2024] },
];

type Exp = {
  company: string; role: string; experienceLevel: string; location: string; year: number;
  process: string; rounds: string; result: string; tips: string; difficulty: string; status: string;
};

const experiences: Exp[] = [
  { company: "Google", role: "Software Engineer", experienceLevel: "mid", location: "Bangalore", year: 2024,
    process: "Recruiter screen → 1 phone DSA → 4 onsite rounds (2 DSA, 1 system design, 1 behavioural).",
    rounds: "Phone: arrays + strings. Onsite: graphs, DP, design a rate limiter, Googleyness.",
    result: "selected", difficulty: "hard", status: "published",
    tips: "Think out loud, clarify constraints early, and always state complexity before coding." },
  { company: "Amazon", role: "SDE II", experienceLevel: "mid", location: "Hyderabad", year: 2024,
    process: "Online assessment → 4 loop rounds, each anchored on 2 Leadership Principles + a coding problem.",
    rounds: "OA: 2 coding + work simulation. Loop: trees, sliding window, LLD of a parking lot, bar raiser.",
    result: "rejected", difficulty: "medium", status: "published",
    tips: "Prepare 6-8 STAR stories mapped to the Leadership Principles — they matter as much as the code." },
  { company: "Meta", role: "Frontend Engineer", experienceLevel: "senior", location: "Remote", year: 2023,
    process: "Recruiter → coding screen → onsite (2 coding, 1 system design, 1 behavioural).",
    rounds: "Build a typeahead component, implement Promise.all, design a news feed.",
    result: "selected", difficulty: "hard", status: "published",
    tips: "For frontend, practice building interactive components from scratch without a framework's help." },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  const companyId: Record<string, string> = {};
  for (const c of companies) {
    const row = await prisma.company.upsert({
      where: { slug: c.slug },
      update: { name: c.name, industry: c.industry, description: c.description, website: c.website, hiringRoles: JSON.stringify(c.roles) },
      create: { name: c.name, slug: c.slug, industry: c.industry, description: c.description, website: c.website, hiringRoles: JSON.stringify(c.roles) },
    });
    companyId[c.slug] = row.id;
  }

  for (const q of questions) {
    await prisma.prepQuestion.upsert({
      where: { slug: q.slug },
      update: {},
      create: {
        title: q.title, slug: q.slug, description: q.description, answer: q.answer,
        companyId: q.company ? companyId[slugify(q.company)] : null,
        technology: q.technology, role: q.role, difficulty: q.difficulty, round: q.round,
        experienceLevel: q.experienceLevel, tags: JSON.stringify(q.tags), yearsAsked: JSON.stringify(q.years),
        views: Math.floor(Math.random() * 4000) + 200, likes: Math.floor(Math.random() * 300) + 5,
        status: "published",
        seoTitle: `${q.title} | Interview Question`,
        seoDescription: q.description.slice(0, 155),
      },
    });
  }

  for (const e of experiences) {
    const cid = companyId[slugify(e.company)];
    const exists = await prisma.prepExperience.findFirst({ where: { companyId: cid, role: e.role, year: e.year } });
    if (exists) continue;
    await prisma.prepExperience.create({
      data: {
        companyId: cid, companyName: e.company, role: e.role, experienceLevel: e.experienceLevel,
        location: e.location, year: e.year, process: e.process, rounds: e.rounds,
        result: e.result, tips: e.tips, difficulty: e.difficulty, status: e.status,
      },
    });
  }

  const [nc, nq, ne] = await Promise.all([
    prisma.company.count(), prisma.prepQuestion.count(), prisma.prepExperience.count(),
  ]);
  console.log(`Seeded: ${nc} companies, ${nq} questions, ${ne} experiences`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

/**
 * Seed a demo creator space so the studio + public page can be viewed end-to-end.
 *
 * Run with: npx tsx prisma/seed-creator-space.ts   (or `npm run seed:creator`)
 * Requires the CREATOR role to exist — run `npm run seed:roles` first.
 *
 * Idempotent: wipes and recreates the `demo-studio` space and all of its demo
 * content (tiers, tutorials, Q&A, experiences, blogs, playgrounds, memberships).
 * Demo blogs/snippets are matched by the `demo-` slug prefix so the creator's
 * real content is never touched. Earnings upsert on a deterministic charge id.
 *
 * Target creator: the user matching SEED_CREATOR_EMAIL, else the first User.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HANDLE = "demo-studio";
const COVER =
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1600&q=80";
const AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&q=80";

// Access policy cycled across each content list: free → Supporter → Pro(+buy).
function accessFor(i: number): { accessTierRank: number | null; purchasePriceCents: number | null } {
  switch (i % 3) {
    case 0:
      return { accessTierRank: null, purchasePriceCents: null }; // free
    case 1:
      return { accessTierRank: 1, purchasePriceCents: null }; // Supporter+
    default:
      return { accessTierRank: 2, purchasePriceCents: 500 }; // Pro or one-time buy
  }
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

// ── Content blueprints ───────────────────────────────────────────────────────
const BLOGS = [
  "Why I stopped using useEffect for data fetching",
  "The mental model that finally made TypeScript generics click",
  "CSS Grid patterns I reach for every week",
  "Debouncing vs throttling: a practical guide",
  "How the event loop really schedules your code",
  "Writing components that are easy to delete",
  "A pragmatic guide to React Server Components",
  "Accessibility wins you can ship today",
  "From REST to typed APIs: what changed for our team",
  "Performance budgets that actually stick",
];

const QA_GUIDES: { title: string; category: string }[] = [
  { title: "Top JavaScript Closure Questions", category: "JavaScript" },
  { title: "React Hooks Interview Questions", category: "React" },
  { title: "CSS & Layout Interview Questions", category: "CSS" },
  { title: "TypeScript Interview Questions", category: "TypeScript" },
  { title: "Frontend System Design Questions", category: "System Design" },
  { title: "Browser & Networking Questions", category: "Web" },
  { title: "Data Structures in JavaScript", category: "DSA" },
  { title: "Async JavaScript Deep Dive", category: "JavaScript" },
  { title: "Accessibility Interview Questions", category: "a11y" },
  { title: "Web Performance Interview Questions", category: "Performance" },
];

const EXPERIENCES: { company: string; role: string; outcome: string; difficulty: string }[] = [
  { company: "Stripe", role: "Frontend Engineer", outcome: "offer", difficulty: "hard" },
  { company: "Vercel", role: "Senior Frontend Engineer", outcome: "rejected", difficulty: "medium" },
  { company: "Google", role: "Frontend Engineer", outcome: "offer", difficulty: "hard" },
  { company: "Meta", role: "Frontend Engineer", outcome: "pending", difficulty: "hard" },
  { company: "Airbnb", role: "Senior Frontend Engineer", outcome: "offer", difficulty: "medium" },
  { company: "Netflix", role: "UI Engineer", outcome: "rejected", difficulty: "hard" },
  { company: "Shopify", role: "Frontend Developer", outcome: "offer", difficulty: "medium" },
  { company: "Atlassian", role: "Frontend Engineer", outcome: "withdrew", difficulty: "medium" },
  { company: "Figma", role: "Product Engineer", outcome: "offer", difficulty: "hard" },
  { company: "Linear", role: "Frontend Engineer", outcome: "offer", difficulty: "medium" },
];

const TUTORIALS = [
  "How React Rendering Actually Works",
  "Mastering Flexbox & Grid",
  "Build a Debounced Search Input",
  "Understanding the JS Event Loop",
  "State Management Without a Library",
  "Intro to Web Accessibility",
  "TypeScript Generics from Scratch",
  "Building a Custom React Hook",
  "CSS Animations & Transitions",
  "Fetch, Cache, and Revalidate",
];

const PLAYGROUNDS = [
  "Counter Component",
  "Todo List",
  "Debounced Search Box",
  "Dark Mode Toggle",
  "Modal with Portal",
  "Fetch with Loading State",
  "Accordion Component",
  "Tabs Component",
  "Form Validation",
  "Stopwatch Timer",
];

async function main() {
  // 1. Pick the creator user.
  const email = process.env.SEED_CREATOR_EMAIL?.toLowerCase();
  const user = email
    ? await prisma.user.findFirst({ where: { email } })
    : await prisma.user.findFirst({ orderBy: { id: "asc" } });
  if (!user) throw new Error("No user found to own the demo space. Create a user first.");
  console.log(`Creator: ${user.name ?? user.email ?? user.id}`);

  // 2. Grant the CREATOR role.
  const creatorRole = await prisma.role.findUnique({ where: { key: "CREATOR" } });
  if (!creatorRole) throw new Error("CREATOR role missing — run `npm run seed:roles` first.");
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: creatorRole.id } },
    update: {},
    create: { userId: user.id, roleId: creatorRole.id },
  });

  // 3a. Wipe prior demo blogs / playgrounds (matched by slug prefix).
  await prisma.blogPost.deleteMany({ where: { userId: user.id, slug: { startsWith: "demo-" } } });
  await prisma.snippet.deleteMany({ where: { userId: user.id, slug: { startsWith: "demo-" } } });

  // 3b. Wipe any prior demo space + its space-scoped content.
  const prior = await prisma.creatorSpace.findUnique({ where: { handle: HANDLE } });
  if (prior) {
    await prisma.$transaction([
      prisma.spaceContent.deleteMany({ where: { spaceId: prior.id } }),
      prisma.spaceTier.deleteMany({ where: { spaceId: prior.id } }),
      prisma.spaceMembership.deleteMany({ where: { spaceId: prior.id } }),
      prisma.tutorial.deleteMany({ where: { spaceId: prior.id } }),
      prisma.interviewQA.deleteMany({ where: { spaceId: prior.id } }),
      prisma.interviewExperience.deleteMany({ where: { spaceId: prior.id } }),
      prisma.creatorSpace.delete({ where: { id: prior.id } }),
    ]);
  }

  // 4. The space — published, customized layout with every section visible.
  const space = await prisma.creatorSpace.create({
    data: {
      ownerId: user.id,
      handle: HANDLE,
      name: "The Frontend Lab",
      tagline: "Interview prep, deep-dive tutorials, and real interview stories.",
      description:
        "## Welcome 👋\n\nI share **battle-tested** frontend interview prep, hands-on tutorials, runnable playgrounds, and honest write-ups of real interview loops. Subscribe for all-access, or grab individual deep dives.",
      avatarUrl: AVATAR,
      coverUrl: COVER,
      published: true,
      layout: {
        heroStyle: "banner",
        alignment: "left",
        theme: "slate",
        sections: [
          { key: "ABOUT", visible: true, cols: 4 },
          { key: "MEMBERSHIP", visible: true, cols: 4 },
          { key: "INTERVIEW_EXPERIENCE", visible: true, cols: 6 },
          { key: "TUTORIAL", visible: true, cols: 8 },
          { key: "INTERVIEW_QA", visible: true, cols: 6 },
          { key: "SNIPPET", visible: true, cols: 6 },
          { key: "CHALLENGE", visible: true, cols: 12 },
          { key: "BLOG_POST", visible: true, cols: 6 },
        ],
      },
    },
  });
  console.log(`Space created: /c/${space.handle}`);

  // 5. Two published tiers.
  const [supporter, pro] = await Promise.all([
    prisma.spaceTier.create({
      data: { spaceId: space.id, name: "Supporter", rank: 1, priceCents: 500, published: true },
    }),
    prisma.spaceTier.create({
      data: { spaceId: space.id, name: "Pro", rank: 2, priceCents: 1500, published: true },
    }),
  ]);

  // Collected for SpaceContent attachment.
  const attach: { contentType: string; contentId: string; access: ReturnType<typeof accessFor> }[] = [];

  // 6. Tutorials (10).
  for (let i = 0; i < TUTORIALS.length; i++) {
    const title = TUTORIALS[i];
    const t = await prisma.tutorial.create({
      data: {
        spaceId: space.id,
        authorId: user.id,
        slug: `demo-${slugify(title)}`,
        title,
        summary: `A focused, practical walkthrough of ${title.toLowerCase()}.`,
        published: true,
        sections: {
          create: [
            { position: 0, title: "Overview", body: `In this tutorial we cover **${title}** with hands-on examples you can run as you read.` },
            { position: 1, title: "Core idea", body: "We start from first principles, then build up to a real, working example step by step." },
            { position: 2, title: "Putting it together", body: "Finally we wire everything into a small project and call out the gotchas to watch for." },
          ],
        },
      },
    });
    attach.push({ contentType: "TUTORIAL", contentId: t.id, access: accessFor(i) });
  }

  // 7. Interview prep guides — InterviewQA (10).
  for (let i = 0; i < QA_GUIDES.length; i++) {
    const { title, category } = QA_GUIDES[i];
    const qa = await prisma.interviewQA.create({
      data: {
        spaceId: space.id,
        authorId: user.id,
        slug: `demo-${slugify(title)}`,
        title,
        summary: `The ${category} questions that come up in real frontend loops, with crisp answers.`,
        category,
        published: true,
        questions: {
          create: [
            { position: 0, question: `What is the single most common ${category} question?`, answer: "Start with the definition, then give a short, concrete example, then mention one edge case.", difficulty: "easy" },
            { position: 1, question: `Explain a tricky ${category} concept interviewers probe.`, answer: "Name the concept, contrast it with a similar one, and finish with when you'd actually reach for it.", difficulty: "medium" },
            { position: 2, question: `A senior-level ${category} follow-up.`, answer: "Walk through the trade-offs out loud — interviewers care about your reasoning more than the perfect answer.", difficulty: "hard" },
          ],
        },
      },
    });
    attach.push({ contentType: "INTERVIEW_QA", contentId: qa.id, access: accessFor(i) });
  }

  // 8. Interview experiences (10).
  for (let i = 0; i < EXPERIENCES.length; i++) {
    const { company, role, outcome, difficulty } = EXPERIENCES[i];
    const title = `My ${company} ${role} loop`;
    const exp = await prisma.interviewExperience.create({
      data: {
        spaceId: space.id,
        authorId: user.id,
        slug: `demo-${slugify(`${company}-${role}`)}`,
        title,
        company,
        role,
        outcome,
        difficulty,
        summary: `A round-by-round breakdown of my ${company} interview — outcome: ${outcome}.`,
        body:
          `## The loop\n\n- **Recruiter screen** — background + a couple of warm-up questions.\n- **Technical phone screen** — live coding, mid-difficulty.\n- **Onsite (virtual):** two coding rounds, one system design, one behavioral.\n\n## What it was like\n\n${company} leaned ${difficulty} on the coding bar. I narrated my thinking, asked clarifying questions early, and tested my own code.\n\n## Outcome\n\nResult: **${outcome}**. ${outcome === "offer" ? "Negotiated and accepted." : outcome === "rejected" ? "Got useful feedback on system design." : outcome === "withdrew" ? "Took another offer mid-process." : "Still waiting to hear back."}\n\n## Tips\n\nPractice on a timer, and rehearse talking out loud — it's a skill of its own.`,
        published: true,
      },
    });
    attach.push({ contentType: "INTERVIEW_EXPERIENCE", contentId: exp.id, access: accessFor(i) });
  }

  // 9. Blogs (10) — owned by the creator, attached to the space.
  for (let i = 0; i < BLOGS.length; i++) {
    const title = BLOGS[i];
    const blog = await prisma.blogPost.create({
      data: {
        userId: user.id,
        slug: `demo-${slugify(title)}`,
        title,
        excerpt: `${title} — lessons learned the hard way, distilled into something you can use today.`,
        content:
          `# ${title}\n\nThis is a demo post for the creator space.\n\n## The problem\n\nEvery team hits this eventually. Here's the version of the story that finally made it click for me.\n\n## The approach\n\n1. Start simple.\n2. Measure before optimizing.\n3. Delete more than you add.\n\n## Takeaway\n\nShip the boring solution first — then iterate with data.`,
        tags: JSON.stringify(["frontend", "interview", "webdev"]),
        published: true,
        status: "PUBLISHED",
      },
    });
    attach.push({ contentType: "BLOG_POST", contentId: blog.id, access: accessFor(i) });
  }

  // 10. Playgrounds — Snippets (10), public so /play/[slug] resolves.
  for (let i = 0; i < PLAYGROUNDS.length; i++) {
    const title = PLAYGROUNDS[i];
    const files = JSON.stringify({
      "/index.html": '<!doctype html>\n<html>\n  <body>\n    <div id="app"></div>\n    <script src="/index.js"></script>\n  </body>\n</html>',
      "/index.js": `// ${title}\nconst app = document.getElementById("app");\napp.innerHTML = "<h1>${title}</h1>";\nconsole.log("${title} ready");`,
    });
    const snippet = await prisma.snippet.create({
      data: {
        userId: user.id,
        slug: `demo-${slugify(title)}`,
        title,
        template: "vanilla",
        files,
        visibility: "public",
        tags: JSON.stringify(["playground", "demo"]),
      },
    });
    attach.push({ contentType: "SNIPPET", contentId: snippet.id, access: accessFor(i) });
  }

  // 11. A few of the creator's real challenges (free), if any exist.
  const challenges = await prisma.challenge.findMany({
    where: { authorId: user.id },
    select: { id: true },
    take: 3,
  });
  challenges.forEach((c) =>
    attach.push({ contentType: "CHALLENGE", contentId: c.id, access: { accessTierRank: null, purchasePriceCents: null } }),
  );

  // 12. Attach everything via SpaceContent (upsert handles the global unique).
  for (const a of attach) {
    await prisma.spaceContent.upsert({
      where: { contentType_contentId: { contentType: a.contentType, contentId: a.contentId } },
      update: { spaceId: space.id, accessTierRank: a.access.accessTierRank, purchasePriceCents: a.access.purchasePriceCents },
      create: {
        spaceId: space.id,
        contentType: a.contentType,
        contentId: a.contentId,
        accessTierRank: a.access.accessTierRank,
        purchasePriceCents: a.access.purchasePriceCents,
      },
    });
  }
  console.log(`Attached ${attach.length} content items.`);

  // 13. A couple of subscribers + earnings so Overview / Users / Payment look real.
  const fans = await Promise.all(
    [
      { email: "demo-fan1@example.com", name: "Ada Fan" },
      { email: "demo-fan2@example.com", name: "Lin Fan" },
    ].map((f) =>
      prisma.user.upsert({ where: { email: f.email }, update: { name: f.name }, create: f }),
    ),
  );

  await prisma.spaceMembership.upsert({
    where: { subscriberId_spaceId: { subscriberId: fans[0].id, spaceId: space.id } },
    update: { tierRank: pro.rank, status: "active" },
    create: {
      subscriberId: fans[0].id,
      spaceId: space.id,
      tierRank: pro.rank,
      stripeSubscriptionId: "demo_sub_pro_1",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });
  await prisma.spaceMembership.upsert({
    where: { subscriberId_spaceId: { subscriberId: fans[1].id, spaceId: space.id } },
    update: { tierRank: supporter.rank, status: "active" },
    create: {
      subscriberId: fans[1].id,
      spaceId: space.id,
      tierRank: supporter.rank,
      stripeSubscriptionId: "demo_sub_supporter_1",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });

  const earnings = [
    { kind: "TIER", sourceId: pro.id, buyerId: fans[0].id, gross: 1500, charge: "demo_charge_1" },
    { kind: "TIER", sourceId: supporter.id, buyerId: fans[1].id, gross: 500, charge: "demo_charge_2" },
    { kind: "CONTENT", sourceId: space.id, buyerId: fans[1].id, gross: 500, charge: "demo_charge_3" },
  ];
  for (const e of earnings) {
    const fee = Math.round(e.gross * 0.2);
    await prisma.creatorEarning.upsert({
      where: { stripeChargeId: e.charge },
      update: {},
      create: {
        creatorId: user.id,
        sourceKind: e.kind,
        sourceId: e.sourceId,
        buyerId: e.buyerId,
        grossCents: e.gross,
        feeCents: fee,
        netCents: e.gross - fee,
        stripeChargeId: e.charge,
        status: "paid",
      },
    });
  }

  console.log("✓ Demo creator space seeded.");
  console.log(`  Studio:  /creator/${space.handle}`);
  console.log(`  Public:  /c/${space.handle}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

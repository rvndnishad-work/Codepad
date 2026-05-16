/**
 * Seed script for challenge tracks.
 *
 * Run with: npx tsx prisma/seed-tracks.ts
 *
 * Idempotent: upserts tracks by slug and wholesale-replaces their items so
 * re-running picks up edits in this file. Enrollments are untouched.
 *
 * The challenges referenced by `itemSlugs` must already exist (run
 * seed-challenges.ts first). Missing slugs are reported and skipped — the
 * track is created with whatever items resolve, so a partial seed doesn't
 * abort the whole run.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type TrackSeed = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  tech: "javascript" | "typescript" | "react" | "vue" | "node" | "algorithms" | "general";
  difficulty: "easy" | "medium" | "hard" | "mixed";
  tags: string[];
  published: boolean;
  featured: boolean;
  /** Ordered list of challenge slugs that should make up this track. */
  itemSlugs: string[];
  /** Optional per-item author notes, keyed by challenge slug. */
  itemNotes?: Record<string, string>;
  /** Optional per-item hint (revealed behind a toggle on the attempt page). */
  itemHints?: Record<string, string>;
  /** Optional per-item walkthrough video URL (YouTube/Vimeo/Loom auto-embed). */
  itemVideos?: Record<string, string>;
};

const tracks: TrackSeed[] = [
  {
    slug: "javascript-warmup",
    title: "JavaScript Warmup",
    tagline: "Three short challenges to refresh core JavaScript fundamentals.",
    description: `Get your fingers moving before a JS-heavy interview.

This track ramps from a classic loop-and-conditionals warmup through
practical array work and into a small higher-order function — the kind
of question that comes up early in a frontend / Node phone screen.

**You'll touch:**
- Loops, conditionals, modulo arithmetic
- Recursion vs. iteration tradeoffs
- Higher-order functions and closures

Plan on ~40 minutes total. If you breeze through the first two, take
your time on **debounce** — the implementation details (leading vs.
trailing, clearing pending timers, returning a value) trip a lot of
people up.`,
    tech: "javascript",
    difficulty: "mixed",
    tags: ["fundamentals", "warmup"],
    published: true,
    featured: true,
    itemSlugs: ["fizzbuzz", "flatten-array", "debounce"],
    itemNotes: {
      fizzbuzz: "Start here. Get comfortable with the test runner.",
      "flatten-array":
        "Try a recursive solution first, then refactor to use `Array.prototype.flat` if you'd like to compare.",
      debounce:
        "Two common gotchas: clearing the previous timeout, and what `this` should be inside the wrapped function.",
    },
    itemHints: {
      fizzbuzz: `Check for 15 first (multiple of both 3 and 5), then 3, then 5, then the number itself.
A single if/else-if chain inside a loop from 1 to n is enough — don't reach for clever one-liners.`,
      "flatten-array": `If the current element is an array, recursively flatten it and spread the result.
Base case: a primitive value goes straight into the output.`,
      debounce: `1) Keep a single \`timeoutId\` variable in the closure.
2) Clear the previous timeout every call.
3) Schedule a new one that invokes \`fn\` with the latest args.
Bonus: pass through \`this\` so it works on methods.`,
    },
    itemVideos: {
      // A well-known short explainer; OK as a demo. Authors will swap their own.
      debounce: "https://www.youtube.com/watch?v=cjIswDCKgu0",
    },
  },
  {
    slug: "algorithms-foundations",
    title: "Algorithms Foundations",
    tagline:
      "Three classic interview warmups across loops, hashing, and basic data structures.",
    description: `A foundational pass through the questions that show up
in almost every phone screen at every level — from new grads to senior
engineers who haven't interviewed in a while.

Each one is short on its own, but the patterns generalize: pointer
manipulation, hashmap-as-lookup, in-place reversal. Master these three
and you'll recognize variants in 30+ other problems.

**You'll touch:**
- Modulo arithmetic and string formatting (FizzBuzz)
- Hashmap lookups for O(n) two-pointer problems (Two Sum)
- Pointer / link rewiring in linear structures (Reverse Linked List)

Estimated ~45 minutes total. The linked-list problem is the only one
that requires care with edge cases (empty list, single node), so save
it for last and give it the attention it deserves.`,
    tech: "algorithms",
    difficulty: "mixed",
    tags: ["interviews", "warmup", "patterns"],
    published: true,
    featured: false,
    itemSlugs: ["fizzbuzz", "two-sum", "reverse-linked-list"],
    itemNotes: {
      fizzbuzz: "Warmup — one branch per condition, watch the `15` case.",
      "two-sum":
        "The naive O(n²) is fine to start. Then refactor to a single pass with a hashmap.",
      "reverse-linked-list":
        "Three-pointer (prev / curr / next) iterative version is the classic. Try the recursive version too if you have time.",
    },
  },
];

async function main() {
  const allSlugs = Array.from(new Set(tracks.flatMap((t) => t.itemSlugs)));
  const challenges = await prisma.challenge.findMany({
    where: { slug: { in: allSlugs }, published: true },
    select: { id: true, slug: true },
  });
  const idBySlug = new Map(challenges.map((c) => [c.slug, c.id]));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const seed of tracks) {
    // Resolve item slugs to challenge IDs, skipping any that don't exist.
    const resolvedItems: {
      slug: string;
      id: string;
      note?: string;
      hint?: string;
      videoUrl?: string;
    }[] = [];
    for (const slug of seed.itemSlugs) {
      const id = idBySlug.get(slug);
      if (!id) {
        console.warn(
          `  ⚠ track "${seed.slug}": referenced challenge "${slug}" not found, skipping that item`
        );
        continue;
      }
      resolvedItems.push({
        slug,
        id,
        note: seed.itemNotes?.[slug],
        hint: seed.itemHints?.[slug],
        videoUrl: seed.itemVideos?.[slug],
      });
    }

    if (resolvedItems.length === 0) {
      console.warn(
        `  ✗ track "${seed.slug}" skipped — no resolvable challenges`
      );
      skipped += 1;
      continue;
    }

    // Upsert the track scalar fields.
    const existed = await prisma.challengeTrack.findUnique({
      where: { slug: seed.slug },
      select: { id: true },
    });

    const track = await prisma.challengeTrack.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        title: seed.title,
        tagline: seed.tagline,
        description: seed.description,
        tech: seed.tech,
        tags: JSON.stringify(seed.tags),
        difficulty: seed.difficulty,
        published: seed.published,
        featured: seed.featured,
      },
      update: {
        title: seed.title,
        tagline: seed.tagline,
        description: seed.description,
        tech: seed.tech,
        tags: JSON.stringify(seed.tags),
        difficulty: seed.difficulty,
        published: seed.published,
        featured: seed.featured,
      },
    });

    // Wholesale-replace items so re-running the seed picks up reorderings
    // and note edits. Cheap; tracks have at most ~10 items typically.
    await prisma.challengeTrackItem.deleteMany({ where: { trackId: track.id } });
    await prisma.challengeTrackItem.createMany({
      data: resolvedItems.map((it, i) => ({
        trackId: track.id,
        challengeId: it.id,
        position: i,
        note: it.note ?? null,
        hint: it.hint ?? null,
        videoUrl: it.videoUrl ?? null,
      })),
    });

    if (existed) {
      updated += 1;
      console.log(`  ↻ updated "${seed.slug}" (${resolvedItems.length} items)`);
    } else {
      created += 1;
      console.log(`  + created "${seed.slug}" (${resolvedItems.length} items)`);
    }
  }

  console.log(
    `\nDone. created=${created} updated=${updated} skipped=${skipped}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

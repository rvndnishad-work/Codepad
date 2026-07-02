/**
 * Seed a minimal set of PromptExemplar rows so the redesigned Practice runner
 * has real content to render in its "Exemplar prompts" section.
 *
 * Run with: npx tsx prisma/seed-prompt-exemplars.ts
 *
 * Idempotent: keyed on (scenarioSlug, title) — re-running is a no-op.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXEMPLARS: {
  scenarioSlug: string;
  title: string;
  summary: string;
  promptText: string;
  rubricScores: Record<string, number>;
}[] = [
  {
    scenarioSlug: "css-responsive-grid",
    title: "Principal Engineer · explicit breakpoints + constraints",
    summary:
      "Strong opening role, breakpoints as a spec table, explicit negative constraint. Scores high on Persona, Specificity, and Constraints.",
    rubricScores: { clarity: 96, specificity: 95, efficiency: 88, context: 94, constraints: 92, edgeCases: 89 },
    promptText: `Act as a Principal Frontend Engineer. Build a responsive product card grid using modern CSS Grid and Flexbox.

### Design System & Aesthetics
- Background: Deep slate dark mode (#0b0f19)
- Cards: glassmorphism — backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); background: rgba(20,24,38,0.6)
- Hover: transform: translateY(-4px) + elevated box-shadow, 300ms ease

### Responsive Breakpoints (Mobile-First)
| viewport | columns |
|---|---|
| < 640px  | 1 |
| 640–1024 | 2 |
| 1024–1280| 3 |
| > 1280   | 4 |

Use \`gap-6\` for card spacing.

### Layout Inside Each Card
- Flex column, h-full
- Order: thumbnail (aspect 16:9, hover zoom) → category tag → title (2-line clamp) → price → CTA
- CTA pushed to bottom with margin-top: auto so cards stay uniform on uneven content

### Quality Constraints
- DO NOT use absolute positioning for responsive alignment
- Use CSS custom properties for theme tokens
- WCAG 2.1 contrast-safe text`,
  },
  {
    scenarioSlug: "css-responsive-grid",
    title: "Concise spec sheet — token-efficient",
    summary:
      "Strips prose, uses bullet lists exclusively. Lower context score but excellent token efficiency. Good template when prompt budget is tight.",
    rubricScores: { clarity: 88, specificity: 90, efficiency: 96, context: 75, constraints: 84, edgeCases: 78 },
    promptText: `Role: Senior frontend engineer. Output: complete React + Tailwind component.

Build: responsive product card grid.

Breakpoints:
- mobile (<640px): 1 col
- tablet (640–1024): 2 cols
- desktop (1024–1280): 3 cols
- xl (>1280): 4 cols

Card anatomy:
- thumb (16:9, lazy-loaded)
- category chip
- title (line-clamp-2)
- price
- "Add to cart" button (mt-auto, full width)

Rules:
- no absolute positioning
- gap-6 between cards
- transition 300ms on hover (translate-y, shadow)
- a11y: WCAG 2.1 contrast

Return only the JSX + Tailwind classes, no commentary.`,
  },
  {
    scenarioSlug: "react-auth-hooks",
    title: "Senior React engineer · typed hook contract",
    summary:
      "Defines the hook's return type up front, lists every edge case (expired token, refresh race, logout-during-request). Scores high on Specificity and Edge Cases.",
    rubricScores: { clarity: 94, specificity: 96, efficiency: 86, context: 92, constraints: 89, edgeCases: 95 },
    promptText: `Act as a Senior React engineer building a production auth layer with TypeScript.

### Goal
Author a \`useAuth()\` hook that wraps an existing \`/api/session\` endpoint.

### Hook contract (TypeScript)
\`\`\`ts
type AuthState =
  | { status: "loading" }
  | { status: "authed"; user: User; token: string }
  | { status: "anon" }
  | { status: "error"; message: string };

function useAuth(): {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};
\`\`\`

### Required behaviour
1. Hydrate from \`/api/session\` on mount (single in-flight request, even with React 18 StrictMode double-invoke).
2. Auto-refresh access token 60s before \`expiresAt\`.
3. Expose a \`signOut\` that clears local state AND calls \`/api/session\` DELETE.

### Edge cases to handle
- Token refresh races with a logout call: logout wins, refresh is cancelled.
- Network failure during refresh: enter \`error\` state, do NOT silently log the user out.
- Multiple components calling \`useAuth\` simultaneously share one subscription (use \`useSyncExternalStore\` or a context).

### Constraints
- No third-party auth libraries.
- Hook must be SSR-safe (no \`window\` access at module scope).`,
  },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const ex of EXEMPLARS) {
    const scenario = await prisma.promptScenario.findUnique({
      where: { slug: ex.scenarioSlug },
      select: { id: true, title: true },
    });
    if (!scenario) {
      console.warn(`  skip — no scenario with slug "${ex.scenarioSlug}"`);
      continue;
    }

    // Idempotency: a (scenarioId, title) pair uniquely identifies a seeded
    // exemplar. Don't insert if one already exists.
    const existing = await prisma.promptExemplar.findFirst({
      where: { scenarioId: scenario.id, title: ex.title },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      console.log(`  skip — already seeded: ${scenario.title} → ${ex.title}`);
      continue;
    }

    await prisma.promptExemplar.create({
      data: {
        scenarioId: scenario.id,
        title: ex.title,
        summary: ex.summary,
        promptText: ex.promptText,
        rubricScores: JSON.stringify(ex.rubricScores),
        source: "admin",
      },
    });
    created += 1;
    console.log(`  add  — ${scenario.title} → ${ex.title}`);
  }

  console.log(`\nDone. created=${created} skipped=${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

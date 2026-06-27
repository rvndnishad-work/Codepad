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
  {
    scenarioSlug: "react-comments-tree",
    title: "Senior UI Engineer · recursive tree + ARIA guidelines",
    summary:
      "Clear props specification, explicit state transitions, left-border visual indent, and nested ARIA list structure. High score on Specificity and Constraints.",
    rubricScores: { clarity: 95, specificity: 94, efficiency: 90, context: 92, constraints: 95, edgeCases: 88 },
    promptText: `Act as a Senior React Engineer. Implement a recursive, nested comment tree component in React and TypeScript.

### Component Props & Types
- Comment object structure:
\`\`\`ts
interface Comment {
  id: string;
  author: string;
  avatarUrl?: string;
  text: string;
  timestamp: string;
  replies: Comment[];
}
\`\`\`

### Key Functional Requirements
1. **Recursive Rendering**: The component must render itself recursively to support unlimited nesting depth. Use a left-border line to indent nested levels visually.
2. **Expand/Collapse**: Each sub-thread should be collapsible. When collapsed, hide all its child replies and show a toggle text indicating the number of hidden replies.
3. **Add Reply**: Provide an inline text input/textarea that appears when clicking "Reply" under a comment. Submitting the reply should trigger an \`onAddReply(parentCommentId, commentText)\` callback.
4. **Keyboard Accessibility**:
   - The thread collapse toggle and reply buttons must be keyboard-focusable interactive elements.
   - Set proper ARIA attributes (e.g., \`aria-expanded\` on collapse toggles, list markup with \`role="list"\` and \`role="listitem"\`).
5. **Edge Cases**:
   - Prevent infinite loops or memory leaks on deep nesting.
   - Hide the reply input field once successfully submitted or cancelled.

Use Tailwind CSS for sleek dark mode styling. Avoid third-party styling or component libraries.`,
  },
  {
    scenarioSlug: "carousel-perf-optimizer",
    title: "Senior Performance Engineer · memory caching + CLS fix",
    summary:
      "Comprehensive performance refactoring guide. Specifies exact caching strategies, lazy loading, pre-fetching logic, and layout stability. High score on Edge Cases and Efficiency.",
    rubricScores: { clarity: 96, specificity: 95, efficiency: 95, context: 90, constraints: 92, edgeCases: 94 },
    promptText: `Act as a Senior Frontend Performance Engineer. Refactor the provided unoptimized React image carousel for maximum performance, responsiveness, and layout stability.

### Bottlenecks to Address:
1. **CPU Overhead**: Cache the list computations (expensive meta mappings) so they do not run on every single render pass. Use \`useMemo\`.
2. **Cumulative Layout Shift (CLS)**: Prevent layout shifts by specifying explicit width/height constraints or aspect-ratio boxes for the main image placeholder.
3. **Network Bandwidth**:
   - Implement eager pre-fetching of only the *immediate next* image in sequence.
   - Use native \`loading="lazy"\` or \`IntersectionObserver\` on preview thumbnail images.
4. **Main Thread Lockup**: Avoid triggering heavy re-computations or layout reflows during navigation.

### Deliverables:
- A fully typed React component (\`OptimizedCarousel\`) in TypeScript.
- Clean inline comments explaining the logic for:
  - Slide pre-fetching.
  - Calculations memoization.
  - Passive event handlers (if touch swipe gesture triggers are included).`,
  },
  {
    scenarioSlug: "form-val-refactor",
    title: "Senior Frontend Engineer · React Hook Form + Zod validation schema",
    summary:
      "Explicit integration steps for react-hook-form and Zod schema. Handles conditional states (submitting, disabled inputs) and localized validation messages. High Clarity and Specificity scores.",
    rubricScores: { clarity: 97, specificity: 96, efficiency: 92, context: 88, constraints: 94, edgeCases: 90 },
    promptText: `Act as a Senior React Developer. Refactor a legacy form with imperative JavaScript validation into a modern React component using React Hook Form, Zod schema validation, and Tailwind CSS.

### Requirements:
1. **Schema Validation (Zod)**:
   - Email: must be a valid email format.
   - Password: minimum 8 characters, containing at least one uppercase letter, one lowercase letter, and one number.
   - Confirm Password: must match Password exactly.
2. **Form Management (React Hook Form)**:
   - Use \`react-hook-form\` with the \`@hookform/resolvers/zod\` resolver.
   - Validate on the \`onBlur\` or \`onChange\` trigger for immediate feedback.
3. **Visual Feedback**:
   - Inputs should have green borders when valid, red borders when invalid.
   - Display clear, user-friendly error messages underneath invalid fields.
4. **Submitting State**:
   - Disable input fields and the submit button while submission is in progress.
   - Show a loading spinner or "Submitting..." text inside the button during flight.

Return a complete TSX component file.`,
  },
  {
    scenarioSlug: "motion-hover-cards",
    title: "Interactive Creative Developer · spring physics + stagger offset",
    summary:
      "Detail-oriented spec sheet for spring parameters, entry offsets, and GPU acceleration. High Efficiency and Constraint score.",
    rubricScores: { clarity: 94, specificity: 95, efficiency: 91, context: 87, constraints: 96, edgeCases: 89 },
    promptText: `Act as an Interactive Creative Developer. Create a beautiful interactive feature card grid component using Framer Motion and Tailwind CSS.

### Animation Specifications:
1. **Entrance (Staggered)**:
   - When the grid mounts, animate the cards sequentially (staggered delay of 0.1s per card).
   - Animate from opacity 0 and y: 20 to opacity 1 and y: 0.
2. **Hover Interaction (3D Tilt)**:
   - On hover, the card should tilt slightly towards the cursor using standard mouse tracking or transform-style: preserve-3d.
   - Provide a scaling effect (e.g., scale to 1.03) and elevate the shadow.
3. **Active/Tap Interaction**:
   - Scale down slightly on tap/click (e.g., scale to 0.98) for immediate tactile feedback.
4. **Spring Physics**:
   - Use spring configurations instead of duration-based tweens for natural velocity transitions (e.g., \`stiffness: 150\`, \`damping: 15\`).

Ensure the component is responsive, fully typed in TypeScript, and uses CSS GPU acceleration properties (\`transform-gpu\`) for buttery smooth 60fps renders.`,
  },
  {
    scenarioSlug: "infinite-scroll-search",
    title: "Senior Frontend Architect · IntersectionObserver pagination + input debounce",
    summary:
      "Full implementation instructions for api gating, request cancellation, scroll offsets, and item virtualization. High Edge Case and Context score.",
    rubricScores: { clarity: 93, specificity: 96, efficiency: 94, context: 92, constraints: 90, edgeCases: 95 },
    promptText: `Act as a Senior Frontend Architect. Build a debounced search input with an infinite scrolling grid of search results.

### Core Architecture:
1. **Input Debouncing**:
   - Implement search term debouncing (e.g., 300ms delay) using a custom hook (\`useDebounce\`) or clean inline timer cleanup.
2. **Infinite Scroll (Intersection Observer)**:
   - Place an observer sentinel at the bottom of the list. When visible, fetch the next page of results.
   - Stop fetching and display a "You've reached the end" message when there are no more pages.
3. **Network Gating & Edge Cases**:
   - If a user changes their search query, cancel any active search/fetch requests to prevent race conditions.
   - Handle loading, error, and empty states cleanly with mock/skeleton cards.
4. **DOM Optimization**:
   - If list grows extremely large, virtualize rendering or ensure DOM cleanup to prevent memory overhead.

Provide clean, modular React TypeScript code.`,
  },
  {
    scenarioSlug: "design-system-configurator",
    title: "Principal Design Systems Engineer · CSS custom variables + WCAG check",
    summary:
      "Detailed specification for CSS custom property injections, nested overrides, and programmatic contrast validation. High Clarity and Specificity score.",
    rubricScores: { clarity: 95, specificity: 96, efficiency: 88, context: 95, constraints: 92, edgeCases: 91 },
    promptText: `Act as a Principal Design Systems Engineer. Architect a runtime theme-switching engine for a design system configurator in React.

### Core Features:
1. **Design Tokens & CSS Variables**:
   - Define a configuration object for color tokens (primary, secondary, background, foreground, border) and spacing scales.
   - Inject these dynamically as CSS custom properties (variables) on a root node.
2. **Nested Theme Provider**:
   - Create a \`<ThemeProvider>\` context.
   - Allow nested \`<ThemeProvider>\` overrides so that a specific section of the page (e.g., a dark sidebar on a light page) can redeclare its theme context.
3. **Programmatic Contrast Validation**:
   - Write a helper utility function that calculates the WCAG 2.1 contrast ratio between the generated background and foreground color tokens.
   - Display a warning badge if a custom theme fails the WCAG AA/AAA contrast guidelines.
4. **Performance**:
   - Avoid triggering full page reflows or re-mounting components when updating theme tokens at runtime.

Provide the complete design system provider implementation in TypeScript.`,
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

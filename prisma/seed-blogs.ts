/**
 * Seed script for sample blog posts. Used for UI density and real-world testing.
 *
 * Run with: npx tsx prisma/seed-blogs.ts
 *
 * Idempotent: deletes existing seeded rows (slugs prefixed "sample-") and
 * recreates them. Spreads posts across the first three users in the DB.
 */
import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

interface SeedPost {
  title: string;
  excerpt: string;
  tags: string[];
  /** Optional Unsplash cover. */
  coverImage?: string;
  /** Days ago the post was "created", to give a realistic spread. */
  daysAgo: number;
  /** View count to make the "Most read" sidebar look real. */
  viewCount: number;
  /** Admin-pinned / staff pick — surfaces as the homepage hero. */
  featured?: boolean;
  content: string;
}

const POSTS: SeedPost[] = [
  {
    title: "Demystifying Model Context Protocol (MCP): The New Standard for Building LLM Agents",
    excerpt: "Standardizing how AI applications and local developer tools securely communicate context. What MCP is, why it matters, and how to build a server in 5 minutes.",
    tags: ["ai", "mcp", "agents", "node"],
    coverImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80",
    daysAgo: 1,
    viewCount: 4250,
    content: `The Model Context Protocol (MCP) is an open-source standard created to bridge the gap between Large Language Models (LLMs) and the environments they run in. Just as LSP (Language Server Protocol) standardized compiler/IDE integration, MCP provides a uniform protocol for AI models to query databases, read local files, execute terminal workflows, and utilize external tools.

### Why Do We Need MCP?

Previously, if you wanted an LLM agent to inspect a database schema or search a folder of files, you had to write custom, ad-hoc integrations for every combination of model API and tool. With MCP, you separate client applications (like IDE extensions or chat interfaces) from the data servers. An agent client connects to any compliant MCP server and immediately discovers its available resources, prompts, and tools.

Here is an architectural view of how MCP works:

- **MCP Client**: The coordinator (e.g., Cursor, Claude Desktop, Antigravity) that interacts with the LLM.
- **MCP Server**: The provider of resources and tools (e.g., a Postgres database connector, a git history viewer).
- **LLM**: The brain that decides which tools to call and parses the result.

### A Simple Node.js MCP Server

Let's write a minimal MCP server that provides a calculator tool. By suffixing the code block language with \`-run\`, you can run this script directly in your browser on Interviewpad!

\`\`\`javascript-run
// A simple runnable mock of an MCP server implementation
class MockMcpServer {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this.tools = {};
  }

  registerTool(name, description, handler) {
    this.tools[name] = { description, handler };
  }

  async callTool(name, args) {
    const tool = this.tools[name];
    if (!tool) throw new Error(\`Tool \${name} not found\`);
    return await tool.handler(args);
  }
}

// Instantiate and register tools
const server = new MockMcpServer("calculator-server", "1.0.0");
server.registerTool("add", "Adds two numbers together", ({ a, b }) => a + b);
server.registerTool("multiply", "Multiplies two numbers", ({ a, b }) => a * b);

// Call tool mock
async function run() {
  const sum = await server.callTool("add", { a: 15, b: 27 });
  console.log("Calculated Sum (15 + 27):", sum);
  
  const product = await server.callTool("multiply", { a: 6, b: 7 });
  console.log("Calculated Product (6 * 7):", product);
}
run();
\`\`\`

### Key Components of MCP

1. **Resources**: Static data sources exposed by the server (e.g., a file's content or a database schema).
2. **Prompts**: Reusable prompt templates that can guide the LLM's system state.
3. **Tools**: Executable functions that allow the LLM to perform actions in the real world (e.g., executing a SQL query or invoking a shell command).

By standardizing these communication interfaces, the developers of AI applications can focus on refining agent workflows rather than writing endless API adapters.`
  },
  {
    title: "React 19 & Next.js 15: Mastering Server Actions, useActionState, and the Uncached GET Shift",
    excerpt: "Hydration warnings, client/server boundaries, and form state hooks. What you need to know to successfully upgrade your Next.js application.",
    tags: ["react", "nextjs", "frontend", "server-actions"],
    coverImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80",
    daysAgo: 3,
    viewCount: 6890,
    featured: true,
    content: `With React 19 and Next.js 15, frontend application architecture completes its shift toward server-first patterns. However, these changes introduce new mental models, particularly around form submission state, hydration warnings, and how HTTP GET requests are cached.

### The Big Shift: GET Requests are no longer cached by default

In Next.js 13 and 14, \`fetch\` calls and route segments defaults to force-cached unless specified otherwise. This caused major headaches with stale dynamic data. Next.js 15 reverses this behavior: by default, HTTP GET requests are **uncached** (\`no-store\`), matching standard web standards. If you want caching, you must explicitly opt-in using \`force-cache\` or static export configurations.

### Managing Form States with React 19's useActionState

React 19 introduces \`useActionState\` (previously named \`useFormState\` in Next.js canary releases) to manage state updates for form submissions. Instead of writing custom loading states and manual \`try-catch\` blocks inside custom event handlers, React handles transitions natively.

Let's look at how we can implement a form state reducer. Try running this mock implementation:

\`\`\`javascript-run
// Simulating React 19 useActionState behavior in pure JS
async function fakeSubmitAction(prevState, formData) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const email = formData.get("email");
  if (!email || !email.includes("@")) {
    return { success: false, error: "Invalid email address" };
  }
  return { success: true, message: \`Subscribed \${email} successfully!\` };
}

// Driver script simulating a browser form submit
async function simulateFormSubmit(emailValue) {
  const formData = {
    get: (key) => emailValue
  };
  
  console.log("Submitting form with:", emailValue);
  let state = { success: false, error: null };
  
  // React 19 triggers the transition
  state = await fakeSubmitAction(state, formData);
  
  if (state.success) {
    console.log("Success Result:", state.message);
  } else {
    console.log("Error Result:", state.error);
  }
}

async function run() {
  await simulateFormSubmit("invalid-email");
  console.log("---");
  await simulateFormSubmit("hello@interviewpad.dev");
}
run();
\`\`\`

### Common Gotchas

1. **Hydration Errors**: Caused when the server-rendered HTML doesn't match the initial client render (e.g. referencing \`window\` or rendering dynamic dates). Fixed in React 19 with better error printouts indicating exactly which tag mismatched.
2. **Server Actions inside Client Components**: You can pass server actions down as props or import them directly, but make sure they are async and don't leak server-only secrets.`
  },
  {
    title: "SQLite in Production: Running Edge & Embedded Databases at Scale in 2026",
    excerpt: "SQLite is no longer just for local testing. Why WAL mode, replica syncing with Litestream, and WASM databases are revolutionizing backend architecture.",
    tags: ["sqlite", "backend", "databases", "architecture"],
    coverImage: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&q=80",
    daysAgo: 5,
    viewCount: 5120,
    featured: true,
    content: `SQLite is historically known as a developer-only desktop database. But in 2026, it is emerging as a production choice for edge compute, SaaS backends, and local-first applications. With massive disk I/O performance on modern NVMe drives, SQLite can outperform client-server databases like PostgreSQL for read-heavy workloads.

### Understanding Write-Ahead Logging (WAL) Mode

The secret to SQLite's performance is Write-Ahead Logging (WAL). In traditional rollback journal mode, writing locks the database, preventing readers. In WAL mode:

- Readers read directly from the main database file and the WAL file concurrently.
- Writers write to the end of the WAL file.
- Reads and writes can happen **simultaneously**, vastly improving concurrency.

Let's look at how query optimization works in SQLite. Run this demo to see how indexes affect query performance in memory:

\`\`\`javascript-run
// Benchmark: Querying sequential records with and without index
const dataSize = 10000;
const database = Array.from({ length: dataSize }, (_, idx) => ({
  id: idx + 1,
  username: \`user_\${idx}\`,
  active: idx % 10 === 0
}));

// Mocking index lookup mapping username -> record index
const index = new Map();
database.forEach((rec, idx) => index.set(rec.username, idx));

// Lookups without index (Full Scan - O(N))
function findWithoutIndex(username) {
  const start = performance.now();
  const result = database.find(u => u.username === username);
  const end = performance.now();
  return { result, timeMs: end - start };
}

// Lookups with index (O(1))
function findWithIndex(username) {
  const start = performance.now();
  const recordIndex = index.get(username);
  const result = recordIndex !== undefined ? database[recordIndex] : null;
  const end = performance.now();
  return { result, timeMs: end - start };
}

const target = "user_9876";
const resultNoIdx = findWithoutIndex(target);
const resultWithIdx = findWithIndex(target);

console.log("No Index Search Time (ms):", resultNoIdx.timeMs.toFixed(4));
console.log("Index Search Time (ms):", resultWithIdx.timeMs.toFixed(4));
console.log("Speedup Factor:", (resultNoIdx.timeMs / resultWithIdx.timeMs).toFixed(2) + "x");
\`\`\`

### Syncing SQLite to the Cloud: Litestream and Edge Architectures

Since SQLite is a single file, replication was historically difficult. Today, two solutions solve this:

1. **Litestream / LiteFS**: Runs as a sidecar process next to your application. It intercepts write transactions and streams them to S3-compatible cloud storage (or replicates them peer-to-peer at the edge).
2. **Turso / LibSQL**: An open-source fork of SQLite that turns it into a distributed database server. It lets you replicate read-replicas right next to your edge serverless functions globally.

### When to Avoid SQLite

While SQLite is incredibly fast, you should stick to traditional client-server databases like PostgreSQL if:
- You require multi-writer database clustering across multiple active servers without partition tolerance.
- Your datasets exceed multiple terabytes.
- You rely heavily on complex database-native extension ecosystems (like PostGIS).`
  },
  {
    title: "The Hidden Cost of Barrel Files in Next.js and Modern JS Applications",
    excerpt: "Why your index.ts re-exports are secretly bloating your production bundles and slowing down your Dev Server Hot Module Replacement (HMR).",
    tags: ["performance", "nextjs", "javascript", "tooling"],
    coverImage: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1200&q=80",
    daysAgo: 8,
    viewCount: 3950,
    content: `We are taught to write tidy code import paths by using "barrel files" — those \`index.ts\` files that gather export statements from multiple subdirectories so clients can import everything from a single file:

\`\`\`typescript
// Components/index.ts (The Barrel File)
export { default as Button } from './Button';
export { default as Card } from './Card';
export { default as Modal } from './Modal';
export { default as Input } from './Input';
\`\`\`

While clean to look at, barrel files create severe performance bottlenecks in modern bundlers like webpack and turbopack.

### The Dependency Cascade

When you write \`import { Button } from '@/components'\`, the bundler is forced to compile and parse the **entire** barrel file (\`components/index.ts\`). Because the barrel file imports and re-exports everything, the bundler must parse \`Card\`, \`Modal\`, and \`Input\`, even if you never use them.

This creates a massive "dependency cascade" where importing one single element pulls in your entire UI library.

### Dev Server and HMR Performance

During development, bundlers compile modules on-demand. If you edit a single file that is exported by a large barrel file, the bundler has to recalculate the dependency graphs of all other files linked by that barrel, slowing down Hot Module Replacement (HMR) from 50ms to multiple seconds.

Let's run a simulation of bundle analysis showing how dependency tracking behaves with and without barrels:

\`\`\`javascript-run
// Benchmarking HMR updates with barrel imports
const modules = {
  "Button.js": { sizeKb: 5, content: "export default () => 'Button'" },
  "Card.js": { sizeKb: 12, content: "export default () => 'Card'" },
  "Modal.js": { sizeKb: 45, content: "import SomeHugeLibrary from 'huge-lib'; export default () => 'Modal'" },
  "Input.js": { sizeKb: 8, content: "export default () => 'Input'" }
};

// Simulation of importing one module directly vs via index.js barrel
function simulateImport(directly) {
  let loadedModules = [];
  let totalSizeKb = 0;
  
  if (directly) {
    loadedModules.push("Button.js");
    totalSizeKb += modules["Button.js"].sizeKb;
  } else {
    // Barrel imports everything to export it
    Object.keys(modules).forEach(name => {
      loadedModules.push(name);
      totalSizeKb += modules[name].sizeKb;
    });
  }
  
  return { loadedModules, totalSizeKb };
}

const direct = simulateImport(true);
const barrel = simulateImport(false);

console.log("Direct Import - Loaded Modules:", direct.loadedModules);
console.log("Direct Import - Total Size:", direct.totalSizeKb + " KB");
console.log("---");
console.log("Barrel Import - Loaded Modules:", barrel.loadedModules);
console.log("Barrel Import - Total Size:", barrel.totalSizeKb + " KB");
console.log("Excess bloat imported:", (barrel.totalSizeKb - direct.totalSizeKb) + " KB");
\`\`\`

### How to Fix it

1. **Avoid Barrels**: Import from the exact file location, e.g., \`import Button from '@/components/Button'\`.
2. **ESLint Rules**: Use \`eslint-plugin-import\`'s \`no-unused-modules\` or \`no-cycle\` rules to detect and prevent complex barrel architectures.
3. **Next.js optimizePackageImports**: Configure Next.js compiler in \`next.config.ts\` to automatically map barrel exports back to their direct files during compilation:
   \`\`\`typescript
   // next.config.ts
   const nextConfig = {
     experimental: {
       optimizePackageImports: ['@/components'],
     },
   };
   \`\`\`
`
  }
];

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) + "-" + nanoid(6)
  );
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 3,
  });
  if (users.length === 0) {
    console.error("No users found. Sign up at least one user first.");
    process.exit(1);
  }

  // Wipe previously seeded sample rows so this script stays idempotent. We
  // identify them by the marker we put in adminNotes — slugs are randomized
  // each run, so we can't match on slug.
  const deleted = await prisma.blogPost.deleteMany({
    where: { adminNotes: "__seed__" },
  });
  console.log(`Cleared ${deleted.count} previously seeded posts.`);

  let created = 0;
  for (let i = 0; i < POSTS.length; i++) {
    const p = POSTS[i];
    const user = users[i % users.length];
    const createdAt = new Date(Date.now() - p.daysAgo * 24 * 60 * 60 * 1000);
    await prisma.blogPost.create({
      data: {
        slug: slugify(p.title),
        title: p.title,
        excerpt: p.excerpt,
        content: p.content,
        coverImage: p.coverImage ?? null,
        tags: JSON.stringify(p.tags),
        published: true,
        featured: p.featured ?? false,
        viewCount: p.viewCount,
        userId: user.id,
        adminNotes: "__seed__",
        createdAt,
        updatedAt: createdAt,
      },
    });
    created++;
  }
  console.log(`Created ${created} high-quality posts across ${users.length} user(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * Content for prisma/seed-recruiter-demo.ts: a fictional hiring team, its
 * candidates, and what each candidate has been through (AI screening,
 * take-home, live interview). Every person and company here is made up; all
 * emails use the reserved example.com domain.
 *
 * Kept apart from the script so the story (who passed, who is waiting on a
 * decision) reads in one place.
 */

export type Level = "strong" | "partial" | "weak";

/* ── Team ────────────────────────────────────────────────────────────────── */

export const TEAM = [
  { key: "priya", name: "Priya Raman", email: "priya.raman@example.com", role: "RECRUITER" },
  { key: "mei", name: "Mei Tanaka", email: "mei.tanaka@example.com", role: "ADMIN" },
  { key: "daniel", name: "Daniel Okafor", email: "daniel.okafor@example.com", role: "INTERVIEWER" },
] as const;

export type TeamKey = (typeof TEAM)[number]["key"] | "owner";

/* ── Candidate batches ───────────────────────────────────────────────────── */

export const BATCHES = [
  { key: "fe", name: "Frontend Engineer · Oct", roleTitle: "Senior Frontend Engineer", owner: "priya", deadlineDays: 14, targetHires: 2, status: "OPEN", createdDaysAgo: 12 },
  { key: "be", name: "Backend Engineer · Oct", roleTitle: "Backend Engineer (Node.js)", owner: "mei", deadlineDays: 21, targetHires: 1, status: "OPEN", createdDaysAgo: 9 },
  { key: "grad", name: "Graduate Engineers · Sep", roleTitle: "Graduate Software Engineer", owner: "priya", deadlineDays: -4, targetHires: 2, status: "CLOSED", createdDaysAgo: 30 },
] as const;

export type BatchKey = (typeof BATCHES)[number]["key"];

/* ── Candidates ──────────────────────────────────────────────────────────── */

export type CandidateSeed = {
  key: string;
  name: string;
  phone?: string;
  source: "linkedin" | "referral" | "careers-page" | "ats" | "manual" | "job-board";
  tags: string[];
  batch: BatchKey | null;
  owner: TeamKey;
  stage: "NEW" | "SCREENING" | "PASSED" | "REJECTED";
  rejectReason?: "SKILL_GAP" | "NO_RESPONSE" | "WITHDREW";
  rejectReasonNote?: string;
  /** Pass given over results below the bar: the recruiter's written reason. */
  manualOverride?: string;
  addedDaysAgo: number;
  stageDaysAgo?: number;
  notes?: { by: TeamKey; body: string; daysAgo: number }[];
};

export const CANDIDATES: CandidateSeed[] = [
  // Frontend batch
  {
    key: "ana", name: "Ana Souza", phone: "+44 7700 900112", source: "referral", tags: ["react", "typescript", "senior"], batch: "fe", owner: "priya", stage: "PASSED", addedDaysAgo: 12, stageDaysAgo: 1,
    notes: [
      { by: "daniel", body: "Live round went well. Clear about trade-offs between memoisation and simpler state, and wrote tests unprompted.", daysAgo: 2 },
      { by: "priya", body: "Referred by the design systems team. Notice period is four weeks.", daysAgo: 11 },
    ],
  },
  {
    key: "ravi", name: "Ravi Menon", source: "linkedin", tags: ["react", "next.js", "senior"], batch: "fe", owner: "priya", stage: "PASSED", addedDaysAgo: 12, stageDaysAgo: 2,
    notes: [{ by: "daniel", body: "Strong on accessibility. A bit quiet at the start of the interview but opened up once coding.", daysAgo: 3 }],
  },
  { key: "lena", name: "Lena Fischer", source: "careers-page", tags: ["react", "css"], batch: "fe", owner: "priya", stage: "SCREENING", addedDaysAgo: 11, stageDaysAgo: 6 },
  {
    key: "tomasz", name: "Tomasz Nowak", source: "linkedin", tags: ["react", "remote"], batch: "fe", owner: "daniel", stage: "SCREENING", addedDaysAgo: 11, stageDaysAgo: 5,
    notes: [{ by: "priya", body: "AI screening above the bar. Booked a live round for later this week.", daysAgo: 1 }],
  },
  { key: "grace", name: "Grace Liu", source: "job-board", tags: ["vue", "react"], batch: "fe", owner: "priya", stage: "SCREENING", addedDaysAgo: 10, stageDaysAgo: 4 },
  {
    key: "kofi", name: "Kofi Mensah", source: "careers-page", tags: ["javascript"], batch: "fe", owner: "priya", stage: "REJECTED", rejectReason: "SKILL_GAP", rejectReasonNote: "Screening well below the bar on both rounds.", addedDaysAgo: 10, stageDaysAgo: 3,
    notes: [{ by: "priya", body: "Integrity flags on the code round (large pastes). Not progressing either way.", daysAgo: 3 }],
  },
  { key: "sara", name: "Sara Lindqvist", source: "linkedin", tags: ["react", "testing"], batch: "fe", owner: "priya", stage: "SCREENING", addedDaysAgo: 6, stageDaysAgo: 0 },
  { key: "noah", name: "Noah Bennett", source: "ats", tags: ["react"], batch: "fe", owner: "priya", stage: "NEW", addedDaysAgo: 2 },
  { key: "isha", name: "Isha Kapoor", source: "referral", tags: ["react", "design-systems"], batch: "fe", owner: "priya", stage: "NEW", addedDaysAgo: 4 },
  { key: "pablo", name: "Pablo Herrera", source: "job-board", tags: ["angular"], batch: "fe", owner: "priya", stage: "NEW", addedDaysAgo: 11 },

  // Backend batch
  {
    key: "yusuf", name: "Yusuf Demir", source: "referral", tags: ["node", "postgres", "senior"], batch: "be", owner: "mei", stage: "PASSED", addedDaysAgo: 9, stageDaysAgo: 1,
    manualOverride: "AI screening at 57, just under the bar. The live round showed strong production experience with queues and Postgres.",
    notes: [
      { by: "daniel", body: "Theory answers were short, but in the live round he designed an idempotent job queue without help. Recommend passing.", daysAgo: 2 },
      { by: "mei", body: "Passing on the strength of the live round. Screening score was borderline.", daysAgo: 1 },
    ],
  },
  { key: "chloe", name: "Chloe Martin", source: "linkedin", tags: ["node", "typescript"], batch: "be", owner: "mei", stage: "SCREENING", addedDaysAgo: 9, stageDaysAgo: 5 },
  { key: "arjun", name: "Arjun Iyer", source: "careers-page", tags: ["node", "go"], batch: "be", owner: "mei", stage: "SCREENING", addedDaysAgo: 8, stageDaysAgo: 4 },
  { key: "fatima", name: "Fatima Zahra", source: "job-board", tags: ["python", "node"], batch: "be", owner: "mei", stage: "REJECTED", rejectReason: "NO_RESPONSE", rejectReasonNote: "Take-home expired and two follow-up emails went unanswered.", addedDaysAgo: 9, stageDaysAgo: 1 },
  { key: "lucas", name: "Lucas Pereira", source: "linkedin", tags: ["node", "aws"], batch: "be", owner: "mei", stage: "SCREENING", addedDaysAgo: 5, stageDaysAgo: 0 },
  { key: "hana", name: "Hana Kim", source: "ats", tags: ["node"], batch: "be", owner: "mei", stage: "NEW", addedDaysAgo: 2 },
  {
    key: "dmitri", name: "Dmitri Volkov", source: "referral", tags: ["node", "kafka"], batch: "be", owner: "daniel", stage: "SCREENING", addedDaysAgo: 8, stageDaysAgo: 3,
    notes: [{ by: "daniel", body: "Interview done, scorecard to follow. Good instincts on back-pressure.", daysAgo: 0 }],
  },

  // Graduate batch (closed)
  { key: "maya", name: "Maya Robinson", source: "careers-page", tags: ["graduate", "python"], batch: "grad", owner: "priya", stage: "PASSED", addedDaysAgo: 30, stageDaysAgo: 18 },
  { key: "samuel", name: "Samuel Adeyemi", source: "careers-page", tags: ["graduate", "java"], batch: "grad", owner: "priya", stage: "PASSED", addedDaysAgo: 30, stageDaysAgo: 16 },
  { key: "zoe", name: "Zoe Clarke", source: "linkedin", tags: ["graduate"], batch: "grad", owner: "priya", stage: "REJECTED", rejectReason: "WITHDREW", rejectReasonNote: "Accepted another offer.", addedDaysAgo: 29, stageDaysAgo: 17 },
  { key: "ibrahim", name: "Ibrahim Haddad", source: "careers-page", tags: ["graduate", "python"], batch: "grad", owner: "priya", stage: "REJECTED", rejectReason: "SKILL_GAP", addedDaysAgo: 29, stageDaysAgo: 19 },
  { key: "nina", name: "Nina Petrova", source: "job-board", tags: ["graduate"], batch: "grad", owner: "priya", stage: "REJECTED", rejectReason: "SKILL_GAP", rejectReasonNote: "Borderline screening; strong candidates ahead of her in this intake.", addedDaysAgo: 28, stageDaysAgo: 18 },

  // Not in a batch yet: fresh from the careers page and the ATS
  { key: "ellis", name: "Ellis Carter", source: "careers-page", tags: ["fullstack"], batch: null, owner: "owner", stage: "NEW", addedDaysAgo: 1 },
  { key: "rhea", name: "Rhea Das", source: "ats", tags: ["data", "python"], batch: null, owner: "owner", stage: "NEW", addedDaysAgo: 0 },
  { key: "jamal", name: "Jamal Wright", source: "manual", tags: ["devops"], batch: null, owner: "owner", stage: "NEW", addedDaysAgo: 3 },
];

export const emailFor = (name: string) =>
  `${name.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").trim().replace(/\s+/g, ".")}@example.com`;

/* ── Questionnaires (Question library) ───────────────────────────────────── */

export type OwnQuestion = { q: string; a: string; answers: Record<Level, string>; grades: Record<Level, { score: number; covered: string; missed: string }> };

/** The team's own React questionnaire, used by the frontend theory round. */
export const REACT_THEORY: OwnQuestion[] = [
  {
    q: "What does the dependency array of useEffect control, and what goes wrong if you leave a value out of it?",
    a: "It lists the values the effect reads from render scope. React re-runs the effect (after running the previous cleanup) whenever one of them changes between renders. Leaving one out means the effect keeps a stale closure: it sees the value from the render it was created in, so it can act on old props or state. An empty array runs the effect once after mount; no array runs it after every render.",
    answers: {
      strong: "The array tells React when to re-run the effect. After each render React compares every entry with the previous render and, if one changed, runs the old cleanup and then the effect again. If I read a prop inside the effect but leave it out, the effect closes over the old value, so it works with stale data. Empty array means once after mount, no array means after every render. The lint rule catches most of these.",
      partial: "It decides when the effect runs again. If a value changes the effect runs again. If you forget one it just will not update when that value changes. Empty array means it only runs on mount.",
      weak: "It is the list of states the component has. If you leave something out React throws a warning.",
    },
    grades: {
      strong: { score: 5, covered: "Re-run on change, cleanup order, stale closures, empty versus missing array.", missed: "Nothing important." },
      partial: { score: 3, covered: "Re-runs when a listed value changes; empty array runs once.", missed: "Did not name the stale closure or the cleanup that runs first." },
      weak: { score: 1, covered: "Knows it relates to re-running.", missed: "Described it as the component state list; no stale closure or timing." },
    },
  },
  {
    q: "Why does React need a key on list items, and why is the array index a risky key?",
    a: "Keys let reconciliation match each child with its previous version, so React keeps the right component state and DOM node when items are inserted, removed or reordered. An index key changes meaning when the list order changes, so state (for example an input's value) moves to the wrong item and React does extra work. A stable id from the data is the right key; the index is fine only for static lists that never reorder.",
    answers: {
      strong: "Keys are how React matches children between renders. With stable keys it can tell an item moved instead of assuming every item changed, and it keeps each item's state attached to the right row. If you use the index and insert at the top, every index shifts, so the state of row one ends up on the new row. Use an id from the data; the index is only safe for a list that never reorders.",
      partial: "React uses the key to know which item is which so it can update the list faster. Using the index can cause bugs when you reorder items, so an id is better.",
      weak: "Keys are required or React shows a warning in the console. The index is fine most of the time.",
    },
    grades: {
      strong: { score: 5, covered: "Reconciliation identity, state following the wrong row, when index is safe.", missed: "Nothing important." },
      partial: { score: 3, covered: "Identity of items and that reordering breaks index keys.", missed: "Did not explain state moving between rows." },
      weak: { score: 1, covered: "Knows a key is expected.", missed: "Treated it as a warning to silence; said the index is usually fine." },
    },
  },
  {
    q: "When would you reach for useMemo or React.memo, and when are they a waste?",
    a: "They skip work when inputs are unchanged: useMemo caches an expensive calculation or keeps an object reference stable, React.memo skips re-rendering a child whose props are shallowly equal. They help for measurably slow renders or when a stable reference feeds another memoised component or an effect dependency. They are a waste for cheap calculations, for components that re-render with new props anyway (for example inline objects or callbacks), and before profiling shows a problem, since they add comparison cost and complexity.",
    answers: {
      strong: "I use them when profiling shows a render is expensive, or when I need a stable reference, for example an object passed to a memoised child or used in an effect dependency. React.memo only does a shallow prop compare, so if the parent passes a new inline object every time it never skips. For cheap work they just add overhead and noise, so I measure first.",
      partial: "useMemo is for expensive calculations so they are not recomputed. React.memo stops a component re-rendering. I would not use them everywhere because it makes code harder to read.",
      weak: "You should wrap components in memo to make them faster. I usually add useMemo to all calculations.",
    },
    grades: {
      strong: { score: 5, covered: "Profiling first, stable references, shallow compare pitfall with inline props.", missed: "Nothing important." },
      partial: { score: 3, covered: "What each hook does and that overuse hurts readability.", missed: "No mention of shallow comparison or stable references for dependencies." },
      weak: { score: 1, covered: "Knows they relate to performance.", missed: "Recommends memoising everything, which is the pitfall itself." },
    },
  },
  {
    q: "How would you share state between two components that are far apart in the tree?",
    a: "Lift the state to the closest common parent when the tree is shallow. When prop drilling gets deep, put it in context, keeping the value stable (memoised) and splitting contexts so unrelated consumers do not re-render. For state that changes often or is shared widely, a store with selectors (Redux, Zustand) limits re-renders. Server data belongs in a data-fetching cache such as React Query rather than global state.",
    answers: {
      strong: "First I lift it to the nearest common parent. If that means drilling through many layers I use context, with the provider value memoised and separate contexts for things that change at different rates, because every consumer re-renders when the value changes. For fast-changing shared state I would use a small store with selectors. Server data I keep in React Query rather than global state.",
      partial: "I would use context or Redux so both components can read it without passing props down.",
      weak: "I would pass it through props from the top of the app down to both components.",
    },
    grades: {
      strong: { score: 5, covered: "Lifting state, context with memoised values and splitting, stores, server cache.", missed: "Nothing important." },
      partial: { score: 3, covered: "Context and a global store.", missed: "No lifting state first, no re-render cost of context." },
      weak: { score: 1, covered: "Props from the root would work.", missed: "No awareness of drilling cost or context." },
    },
  },
  {
    q: "What is the difference between a controlled and an uncontrolled input?",
    a: "A controlled input takes its value from React state and reports changes through onChange, so React is the single source of truth (easy validation and formatting, one render per keystroke). An uncontrolled input keeps its own value in the DOM, read through a ref or form data when needed, with defaultValue for the initial value. Uncontrolled suits simple forms and file inputs; controlled suits inputs whose value drives other UI.",
    answers: {
      strong: "Controlled means the value comes from state and every change goes through onChange, so React owns it and I can validate or format as the user types. Uncontrolled means the DOM keeps the value and I read it with a ref or FormData on submit, setting defaultValue for the start. File inputs are always uncontrolled.",
      partial: "Controlled inputs use state and onChange. Uncontrolled inputs use a ref to get the value.",
      weak: "Controlled inputs are the ones inside a form element.",
    },
    grades: {
      strong: { score: 5, covered: "Source of truth, onChange, refs and defaultValue, file inputs.", missed: "Nothing important." },
      partial: { score: 4, covered: "State plus onChange versus refs.", missed: "Did not say when to prefer either." },
      weak: { score: 0, covered: "Nothing correct.", missed: "Confused controlled with being inside a form." },
    },
  },
];

/** The team's own Node.js questionnaire, used by the backend theory round. */
export const NODE_THEORY: OwnQuestion[] = [
  {
    q: "Walk me through what happens in the Node.js event loop when a setTimeout, a resolved promise and a setImmediate are all scheduled from the main script.",
    a: "The synchronous script runs to completion first. Then the microtask queue drains, so the promise callback runs next (process.nextTick callbacks would run before it). Then the event loop starts: the timers phase runs the setTimeout callback if its delay has elapsed, and the check phase runs setImmediate. From the main module the order of setTimeout(0) and setImmediate is not guaranteed; inside an I/O callback setImmediate always runs first.",
    answers: {
      strong: "The main script finishes, then microtasks drain, so the promise callback runs first. nextTick would even beat it. Then the loop enters the timers phase for the setTimeout and later the check phase for setImmediate. From the main module timeout versus immediate can go either way depending on how fast the loop starts; inside an I/O callback immediate always wins.",
      partial: "The promise runs first because it is a microtask. Then setTimeout, then setImmediate.",
      weak: "setTimeout with zero runs first because it has no delay, then the promise, then setImmediate.",
    },
    grades: {
      strong: { score: 5, covered: "Microtasks first, nextTick priority, timers versus check phase, non-determinism from main.", missed: "Nothing important." },
      partial: { score: 3, covered: "Promise first as a microtask.", missed: "Stated a fixed order for setTimeout and setImmediate, which is not guaranteed." },
      weak: { score: 1, covered: "Names the three APIs.", missed: "Put setTimeout before the promise; no microtask queue." },
    },
  },
  {
    q: "What is back-pressure in Node.js streams and how do you handle it?",
    a: "Back-pressure is when a writable consumes data slower than the readable produces it. write() returns false once the internal buffer passes highWaterMark; the producer should stop and wait for the 'drain' event. pipe() and stream.pipeline() handle this automatically, and pipeline also forwards errors and cleans up. Ignoring it makes memory grow without bound.",
    answers: {
      strong: "It is the slow consumer problem. When the writable's buffer passes highWaterMark, write returns false and you should pause until drain. pipe and especially stream.pipeline do that for you, and pipeline also handles errors and destroys the streams. If you ignore the return value, memory just keeps growing.",
      partial: "It is when data comes in faster than you can write it. You can use pipe to handle it.",
      weak: "It is when the stream has an error and you need to retry.",
    },
    grades: {
      strong: { score: 5, covered: "write returning false, drain, highWaterMark, pipeline error handling.", missed: "Nothing important." },
      partial: { score: 3, covered: "Producer faster than consumer; pipe handles it.", missed: "No write return value or drain event." },
      weak: { score: 0, covered: "Nothing correct.", missed: "Confused back-pressure with error retries." },
    },
  },
  {
    q: "When would you use worker_threads instead of the cluster module?",
    a: "cluster forks separate processes that share a server port, which scales an HTTP server across CPU cores with isolated memory. worker_threads run JavaScript in threads inside one process, suited to CPU-heavy tasks (parsing, image work, hashing) that would otherwise block the event loop, and can share memory with SharedArrayBuffer. I/O-bound work does not need either.",
    answers: {
      strong: "Cluster is for scaling a server across cores with separate processes behind one port. Worker threads are for CPU-heavy work inside a process, like hashing or parsing a big file, so it does not block the event loop, and they can share memory. For I/O-bound work neither helps much because Node is already non-blocking there.",
      partial: "Cluster makes several processes, worker threads make threads. Threads are lighter so I would use them for heavy work.",
      weak: "I would always use cluster because it is the built-in way to make Node multi-threaded.",
    },
    grades: {
      strong: { score: 5, covered: "Processes versus threads, port sharing, CPU-bound work, shared memory, I/O note.", missed: "Nothing important." },
      partial: { score: 3, covered: "Processes versus threads.", missed: "No link between cluster and scaling HTTP or between workers and blocking the loop." },
      weak: { score: 1, covered: "Knows cluster exists.", missed: "Called cluster multi-threading." },
    },
  },
  {
    q: "How do you make sure an unexpected error in an async request handler does not crash the whole server?",
    a: "Await promises inside try/catch (or an async wrapper) and pass errors to a central error middleware that returns a 500 and logs with context. Handle 'error' events on streams and emitters. process.on('unhandledRejection') and 'uncaughtException' are a last line of logging, after which the process should exit and be restarted by the supervisor, because its state may be corrupt.",
    answers: {
      strong: "Wrap handlers so rejected promises go to one error middleware that logs with the request id and returns a 500. Listen for error events on streams. unhandledRejection and uncaughtException are only for logging before exiting, and the process manager restarts it, since after an uncaught exception the state is not trustworthy.",
      partial: "Use try catch around the await and return a 500. You can also add process.on uncaughtException so the server keeps running.",
      weak: "Use try catch everywhere.",
    },
    grades: {
      strong: { score: 5, covered: "Central error middleware, stream error events, exit-and-restart after uncaught errors.", missed: "Nothing important." },
      partial: { score: 2, covered: "try/catch and a 500 response.", missed: "Suggested keeping the process alive after uncaughtException, which is unsafe." },
      weak: { score: 1, covered: "try/catch.", missed: "Nothing on central handling, streams or process-level handlers." },
    },
  },
];

/** Behavioural questionnaire, used by the graduate conversation round. */
export const OWNERSHIP_QUESTIONS: { q: string; a: string; answers: Record<Level, string> }[] = [
  {
    q: "Tell me about a project where something went wrong. What did you do about it?",
    a: "A specific situation, the candidate's own actions (not the team's), what they learned, and what they changed afterwards.",
    answers: {
      strong: "In my final-year project our database migrations broke the shared demo the night before a review. I rolled back, wrote down the exact steps that failed, and then added a script that runs the migrations against a copy first. We used that for the rest of the year.",
      partial: "In a group project we missed a deadline because one person did not do their part. We talked about it and split the work again.",
      weak: "Nothing has really gone wrong in my projects so far.",
    },
  },
  {
    q: "How do you decide what to work on first when you have several tasks due at once?",
    a: "Impact and urgency, dependencies that block others, asking for clarity when priorities conflict, and telling people early about what will slip.",
    answers: {
      strong: "I look at what blocks other people first, then deadlines and impact. If two things clash I ask whoever set them which matters more, and I tell people early if something will be late rather than on the day.",
      partial: "I start with whatever is due first.",
      weak: "I usually do the easiest task first to get it out of the way.",
    },
  },
  {
    q: "Describe a time you disagreed with a teammate. How was it resolved?",
    a: "Listened to the other view, argued from evidence, reached a decision, and kept the working relationship.",
    answers: {
      strong: "A teammate wanted to rewrite our API in a new framework mid-sprint. I disagreed, so I timed how long the migration would take on one endpoint and we looked at it together. We agreed to finish the sprint and plan the rewrite, and we still work well together.",
      partial: "We disagreed about how to name things. In the end we went with his idea to move on.",
      weak: "I just did it my way because I was sure I was right.",
    },
  },
  {
    q: "What have you learned recently outside of your coursework, and how did you learn it?",
    a: "Genuine curiosity, a concrete topic, a method (building something, reading source, courses), and what they did with it.",
    answers: {
      strong: "I learned how Postgres indexes work because a side project got slow. I read the docs on EXPLAIN, added the right composite index, and wrote a short blog post about the before and after timings.",
      partial: "I did an online course on Docker.",
      weak: "I have not had much time for that.",
    },
  },
];

/** A non-technical questionnaire, so the library is not only engineering. */
export const DISCOVERY_QUESTIONS: { q: string; a: string }[] = [
  { q: "A customer says the product is too expensive. How do you respond?", a: "Asks what they compare it with, ties value to their goals and numbers, never discounts first, and knows when the fit is genuinely poor." },
  { q: "How do you prepare for a first call with a new account?", a: "Researches the company and the contact, writes the questions they want answered, and sets a clear goal and next step for the call." },
  { q: "Tell me about a customer you turned around after a bad experience.", a: "Owned the problem, fixed the root cause with the right team, followed up without being asked, and measured the result." },
  { q: "What would you track to know a customer is at risk of leaving?", a: "Usage trends, support tickets, missed meetings, champion leaving, renewal date, and a plan to act on each signal." },
];

/**
 * Questionnaires copied from the public question bank. Each entry names a
 * technology and title keywords; the seed takes the first published bank
 * question that matches, so these read exactly like "Add from public
 * questions". Skipped (with a note) when the bank is not loaded.
 */
export const BANK_QUESTIONNAIRES = [
  { key: "js", title: "JavaScript core", roleArea: "JavaScript", tech: "javascript", minutes: 20, keywords: ["closure", "this", "promise", "hoisting", "prototype"] },
  { key: "sd", title: "System design warm-up", roleArea: "System design", tech: "system-design", minutes: 30, keywords: ["rate limit", "cach", "shard", "consistent hashing"] },
] as const;

/* ── Workspace coding challenges (take-homes) ────────────────────────────── */

export const CHALLENGES = [
  {
    key: "debounce",
    slug: "search-with-debounce",
    title: "Search box with debounced requests",
    difficulty: "medium",
    template: "react",
    category: "Frontend",
    estimatedMinutes: 45,
    tags: ["react", "hooks", "performance"],
    description: `## Search box with debounced requests

Build a search box that filters the product list as the user types, but only
"calls the API" (the \`search\` function in \`api.js\`) once the user has
stopped typing for **300 ms**.

- Show a loading hint while a request is in flight.
- Ignore responses that arrive for an older query.
- Keep the input responsive: typing must never wait on a request.`,
    starterFiles: {
      "/App.js": `import { useState } from "react";
import { search } from "./api";
import "./styles.css";

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  // TODO: call search(query) 300 ms after the user stops typing,
  // show a loading hint, and ignore stale responses.

  return (
    <main>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" />
      <ul>
        {results.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </main>
  );
}
`,
      "/api.js": `const PRODUCTS = ["Desk lamp", "Desk chair", "Monitor arm", "Laptop stand", "Cable tray", "Footrest"].map((name, i) => ({ id: i + 1, name }));

export function search(query) {
  const delay = 150 + Math.random() * 400;
  return new Promise((resolve) =>
    setTimeout(() => resolve(PRODUCTS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))), delay),
  );
}
`,
      "/styles.css": `main { font-family: system-ui, sans-serif; padding: 24px; max-width: 420px; }
input { width: 100%; padding: 8px 10px; font-size: 15px; }
li { padding: 6px 0; }
`,
    },
    testFiles: {},
  },
  {
    key: "lru",
    slug: "lru-cache-ts",
    title: "LRU cache with O(1) operations",
    difficulty: "medium",
    template: "test-ts",
    category: "Data structures",
    estimatedMinutes: 40,
    tags: ["hashmap", "design"],
    description: `## LRU cache

Implement \`LRUCache\` with \`get(key)\` and \`put(key, value)\`, both O(1).

- \`get\` returns the value or \`-1\`, and marks the key as recently used.
- \`put\` inserts or updates, evicting the least recently used key when full.`,
    starterFiles: {
      "/index.ts": `export class LRUCache {
  constructor(private capacity: number) {}

  get(key: number): number {
    // TODO
    return -1;
  }

  put(key: number, value: number): void {
    // TODO
  }
}
`,
    },
    testFiles: {
      "/index.test.ts": `import { LRUCache } from "./index";

describe("LRUCache", () => {
  it("returns stored values", () => {
    const c = new LRUCache(2);
    c.put(1, 1);
    expect(c.get(1)).toBe(1);
  });

  it("evicts the least recently used key", () => {
    const c = new LRUCache(2);
    c.put(1, 1);
    c.put(2, 2);
    c.get(1);
    c.put(3, 3);
    expect(c.get(2)).toBe(-1);
    expect(c.get(1)).toBe(1);
    expect(c.get(3)).toBe(3);
  });

  it("updates an existing key without evicting", () => {
    const c = new LRUCache(2);
    c.put(1, 1);
    c.put(2, 2);
    c.put(1, 10);
    c.put(3, 3);
    expect(c.get(1)).toBe(10);
    expect(c.get(2)).toBe(-1);
  });
});
`,
    },
  },
  {
    key: "retry",
    slug: "fetch-with-retry-ts",
    title: "fetchWithRetry with exponential backoff",
    difficulty: "medium",
    template: "test-ts",
    category: "Backend",
    estimatedMinutes: 35,
    tags: ["async", "resilience"],
    description: `## fetchWithRetry

Write \`withRetry(fn, { retries, baseMs })\` that calls the async \`fn\`, retrying
on failure up to \`retries\` times with exponential backoff (\`baseMs\`, then
double each time). Resolve with the first success; reject with the last error.`,
    starterFiles: {
      "/index.ts": `export async function withRetry<T>(fn: () => Promise<T>, opts: { retries: number; baseMs: number }): Promise<T> {
  // TODO
  return fn();
}
`,
    },
    testFiles: {
      "/index.test.ts": `import { withRetry } from "./index";

describe("withRetry", () => {
  it("resolves on the first success", async () => {
    let calls = 0;
    const out = await withRetry(async () => { calls++; if (calls < 3) throw new Error("x"); return "ok"; }, { retries: 3, baseMs: 1 });
    expect(out).toBe("ok");
    expect(calls).toBe(3);
  });

  it("rejects with the last error after the retries run out", async () => {
    let calls = 0;
    await expect(withRetry(async () => { calls++; throw new Error("fail " + calls); }, { retries: 2, baseMs: 1 })).rejects.toThrow("fail 3");
  });
});
`,
    },
  },
  {
    key: "modal",
    slug: "accessible-modal-dialog",
    title: "Accessible modal dialog",
    difficulty: "hard",
    template: "react",
    category: "Frontend",
    estimatedMinutes: 60,
    tags: ["react", "accessibility"],
    description: `## Accessible modal dialog

Finish the \`Modal\` component so it is usable with a keyboard and a screen reader:

- Focus moves into the dialog when it opens and back to the trigger when it closes.
- Tab and Shift+Tab stay inside the dialog.
- Escape closes it; the page behind is inert.
- The dialog has a proper role and an accessible name.`,
    starterFiles: {
      "/App.js": `import { useState } from "react";
import Modal from "./Modal";

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <button onClick={() => setOpen(true)}>Delete project</button>
      {open && (
        <Modal title="Delete project?" onClose={() => setOpen(false)}>
          <p>This cannot be undone.</p>
          <button onClick={() => setOpen(false)}>Cancel</button>
          <button onClick={() => setOpen(false)}>Delete</button>
        </Modal>
      )}
    </main>
  );
}
`,
      "/Modal.js": `export default function Modal({ title, onClose, children }) {
  // TODO: role, aria-modal, labelled title, focus in and out, focus trap, Escape
  return (
    <div className="backdrop">
      <div className="dialog">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
`,
    },
    testFiles: {},
  },
] as const;

export type ChallengeKey = (typeof CHALLENGES)[number]["key"];

/* ── Practical AI screening rounds: what the candidate wrote ─────────────── */

/** Replacement for the starter's TODO function, by level. */
export const PARENS_SOLUTIONS: Record<Level, string> = {
  strong: `export function isValidParentheses(s) {
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") {
      stack.push(ch);
    } else if (ch in pairs) {
      // A closer must match the most recent opener.
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}`,
  partial: `export function isValidParentheses(s) {
  const stack = [];
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") stack.push(ch);
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (!stack.length) return false;
      stack.pop();
    }
  }
  return stack.length === 0;
}`,
  weak: `export function isValidParentheses(s) {
  let open = 0;
  for (const ch of s) {
    if (ch === "(") open++;
    if (ch === ")") open--;
  }
  return open === 0;
}`,
};

export const RATE_LIMITER_SOLUTIONS: Record<Level, string> = {
  strong: `class RateLimiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.hits = new Map(); // key -> timestamps, oldest first
  }

  allow(key, nowMs) {
    const cutoff = nowMs - this.windowMs;
    const list = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (list.length >= this.limit) {
      this.hits.set(key, list);
      return false;
    }
    list.push(nowMs);
    this.hits.set(key, list);
    return true;
  }
}`,
  partial: `class RateLimiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.counts = {};
  }

  allow(key, nowMs) {
    // Fixed window: resets at each window boundary.
    const windowId = Math.floor(nowMs / this.windowMs);
    const k = key + ":" + windowId;
    this.counts[k] = (this.counts[k] || 0) + 1;
    return this.counts[k] <= this.limit;
  }
}`,
  weak: `class RateLimiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.count = 0;
  }

  allow(key, nowMs) {
    this.count++;
    return this.count <= this.limit;
  }
}`,
};

export const ANAGRAM_SOLUTIONS: Record<Level, string> = {
  strong: `def groupAnagrams(words):
    groups = defaultdict(list)
    for w in words:
        groups["".join(sorted(w))].append(w)
    return list(groups.values())`,
  partial: `def groupAnagrams(words):
    result = []
    used = set()
    for i, w in enumerate(words):
        if i in used:
            continue
        group = [w]
        for j in range(i + 1, len(words)):
            if sorted(words[j]) == sorted(w):
                group.append(words[j])
                used.add(j)
        result.append(group)
    return result`,
  weak: `def groupAnagrams(words):
    # TODO: implement — return a list of groups (lists of strings)
    return [words]`,
};

/* ── What each candidate went through ────────────────────────────────────── */

export type ScreeningSeed = {
  candidate: string;
  status: "COMPLETED" | "ACTIVE" | "PENDING" | "EXPIRED";
  /** Invite sent this many days ago. */
  invitedDaysAgo: number;
  /** COMPLETED only: level per theory/conversation question, then the code round. */
  answers?: Level[];
  code?: Level;
  codeScore?: number;
  suspicion?: number;
  reminderSent?: boolean;
};

export const SCREENINGS: Record<"fe" | "be" | "grad", ScreeningSeed[]> = {
  fe: [
    { candidate: "ana", status: "COMPLETED", invitedDaysAgo: 11, answers: ["strong", "strong", "strong", "strong", "partial"], code: "strong", codeScore: 92, suspicion: 4 },
    { candidate: "ravi", status: "COMPLETED", invitedDaysAgo: 11, answers: ["strong", "partial", "strong", "strong", "strong"], code: "strong", codeScore: 84, suspicion: 8 },
    { candidate: "lena", status: "COMPLETED", invitedDaysAgo: 10, answers: ["strong", "partial", "partial", "strong", "strong"], code: "partial", codeScore: 71, suspicion: 12 },
    { candidate: "tomasz", status: "COMPLETED", invitedDaysAgo: 10, answers: ["partial", "strong", "partial", "partial", "strong"], code: "partial", codeScore: 66, suspicion: 6 },
    { candidate: "grace", status: "COMPLETED", invitedDaysAgo: 9, answers: ["partial", "partial", "weak", "partial", "partial"], code: "partial", codeScore: 58, suspicion: 38 },
    { candidate: "kofi", status: "COMPLETED", invitedDaysAgo: 9, answers: ["weak", "weak", "weak", "partial", "weak"], code: "weak", codeScore: 28, suspicion: 71 },
    { candidate: "sara", status: "ACTIVE", invitedDaysAgo: 3 },
    { candidate: "noah", status: "PENDING", invitedDaysAgo: 1 },
    { candidate: "isha", status: "PENDING", invitedDaysAgo: 3, reminderSent: true },
    { candidate: "pablo", status: "EXPIRED", invitedDaysAgo: 10, reminderSent: true },
  ],
  be: [
    { candidate: "yusuf", status: "COMPLETED", invitedDaysAgo: 8, answers: ["partial", "partial", "strong", "partial"], code: "partial", codeScore: 48, suspicion: 5 },
    { candidate: "chloe", status: "COMPLETED", invitedDaysAgo: 8, answers: ["strong", "strong", "partial", "strong"], code: "strong", codeScore: 81, suspicion: 9 },
    { candidate: "arjun", status: "COMPLETED", invitedDaysAgo: 7, answers: ["partial", "strong", "strong", "partial"], code: "partial", codeScore: 64, suspicion: 14 },
    { candidate: "lucas", status: "ACTIVE", invitedDaysAgo: 2 },
    { candidate: "hana", status: "PENDING", invitedDaysAgo: 1 },
  ],
  grad: [
    { candidate: "maya", status: "COMPLETED", invitedDaysAgo: 28, answers: ["strong", "strong", "partial", "strong"], code: "strong", codeScore: 88, suspicion: 3 },
    { candidate: "samuel", status: "COMPLETED", invitedDaysAgo: 28, answers: ["strong", "partial", "strong", "partial"], code: "partial", codeScore: 72, suspicion: 10 },
    { candidate: "zoe", status: "COMPLETED", invitedDaysAgo: 27, answers: ["partial", "strong", "partial", "partial"], code: "partial", codeScore: 60, suspicion: 7 },
    { candidate: "ibrahim", status: "COMPLETED", invitedDaysAgo: 27, answers: ["weak", "partial", "weak", "weak"], code: "weak", codeScore: 30, suspicion: 18 },
    { candidate: "nina", status: "COMPLETED", invitedDaysAgo: 26, answers: ["partial", "partial", "partial", "weak"], code: "partial", codeScore: 50, suspicion: 11 },
  ],
};

/** Conversation-round score for a behavioural answer, 0 to 100. */
export const CONVERSATION_POINTS: Record<Level, number> = { strong: 92, partial: 62, weak: 25 };

export type TakeHomeSeed = {
  candidate: string;
  challenges: ChallengeKey[];
  status: "scheduled" | "in_progress" | "completed" | "expired";
  sentDaysAgo: number;
  deadlineDays: number;
  /** Score per challenge, for completed take-homes. */
  scores?: number[];
  minutes?: number[];
  /** Large pastes and tab switches per question; clean when left out. */
  integrity?: { pastes: number; blurs: number; blurSec: number }[];
};

/** Saved question sets on the Take home Templates tab, keyed by batch. */
export const TAKE_HOME_TEMPLATES: { key: string; batch: string; name: string; items: { challenge: ChallengeKey; minutes: number }[] }[] = [
  { key: "fe", batch: "fe", name: "Senior Frontend Engineer", items: [{ challenge: "debounce", minutes: 30 }, { challenge: "modal", minutes: 30 }] },
  { key: "be", batch: "be", name: "Backend Engineer (Node.js)", items: [{ challenge: "lru", minutes: 45 }, { challenge: "retry", minutes: 30 }] },
];

/** Take-homes sent through Take home (the multi-question session model). */
export const TAKE_HOMES: TakeHomeSeed[] = [
  { candidate: "ana", challenges: ["debounce", "modal"], status: "completed", sentDaysAgo: 8, deadlineDays: -1, scores: [95, 89], minutes: [38, 52] },
  { candidate: "ravi", challenges: ["debounce", "modal"], status: "completed", sentDaysAgo: 8, deadlineDays: -1, scores: [86, 81], minutes: [41, 58] },
  { candidate: "lena", challenges: ["debounce", "modal"], status: "in_progress", sentDaysAgo: 2, deadlineDays: 3 },
  {
    candidate: "tomasz",
    challenges: ["debounce", "modal"],
    status: "completed",
    sentDaysAgo: 4,
    deadlineDays: 2,
    scores: [60, 44],
    minutes: [26, 18],
    integrity: [
      { pastes: 1, blurs: 2, blurSec: 70 },
      { pastes: 1, blurs: 1, blurSec: 30 },
    ],
  },
  { candidate: "chloe", challenges: ["lru", "retry"], status: "completed", sentDaysAgo: 5, deadlineDays: 2, scores: [67, 100], minutes: [39, 22] },
  { candidate: "arjun", challenges: ["lru", "retry"], status: "scheduled", sentDaysAgo: 1, deadlineDays: 6 },
  { candidate: "fatima", challenges: ["lru", "retry"], status: "expired", sentDaysAgo: 9, deadlineDays: -2 },
];

/** Older single-challenge invites (the legacy take-home link). */
export const LEGACY_TAKE_HOMES = [
  { candidate: "dmitri", challenge: "retry", status: "PENDING", sentDaysAgo: 1, expiresDays: 6 },
  { candidate: "samuel", challenge: "lru", status: "SUBMITTED", sentDaysAgo: 24, expiresDays: -17, score: 67, minutes: 36 },
] as const;

export type InterviewSeed = {
  candidate: string;
  title: string;
  interviewer: TeamKey;
  status: "scheduled" | "in_progress" | "completed";
  /** Negative: in the past. */
  atDays: number;
  minutes: number;
  challenges: ChallengeKey[];
  ratings?: { CodeQuality: number; ProblemSolving: number; Communication: number };
  verdict?: "success" | "failed";
  notes?: string;
};

export const INTERVIEWS: InterviewSeed[] = [
  { candidate: "ana", title: "Senior Frontend: live pairing", interviewer: "daniel", status: "completed", atDays: -2, minutes: 60, challenges: ["modal"], ratings: { CodeQuality: 5, ProblemSolving: 4, Communication: 4 }, verdict: "success", notes: "Handled focus return and the inert background without hints." },
  { candidate: "ravi", title: "Senior Frontend: live pairing", interviewer: "daniel", status: "completed", atDays: -3, minutes: 60, challenges: ["modal"], ratings: { CodeQuality: 4, ProblemSolving: 4, Communication: 4 }, verdict: "success" },
  { candidate: "tomasz", title: "Senior Frontend: live pairing", interviewer: "daniel", status: "scheduled", atDays: 2, minutes: 60, challenges: ["debounce"] },
  { candidate: "yusuf", title: "Backend: system design and code", interviewer: "daniel", status: "completed", atDays: -2, minutes: 75, challenges: ["retry"], ratings: { CodeQuality: 4, ProblemSolving: 4, Communication: 3 }, verdict: "success", notes: "Designed an idempotent job queue with retries and a dead-letter table." },
  { candidate: "dmitri", title: "Backend: system design and code", interviewer: "daniel", status: "completed", atDays: 0, minutes: 75, challenges: ["lru"] },
  { candidate: "chloe", title: "Backend: system design and code", interviewer: "mei", status: "scheduled", atDays: 1, minutes: 75, challenges: ["lru"] },
  { candidate: "samuel", title: "Graduate: pair programming", interviewer: "daniel", status: "completed", atDays: -20, minutes: 45, challenges: ["lru"], ratings: { CodeQuality: 4, ProblemSolving: 4, Communication: 3 }, verdict: "success" },
];

/* ── Prompt tasks (Question library) ───────────────────────────────────── */

/** The team's own prompt-writing scenarios, next to the built-in ones. */
export const PROMPT_TASKS = [
  {
    key: "release-notes",
    title: "Release notes from a changelog",
    description:
      "Your team ships every Friday. The raw changelog is a list of merged pull request titles, some of them internal. Customers read the release notes in the app.",
    objective: "Write a prompt that turns the pull request titles into short, customer-facing release notes grouped by feature, leaving out internal changes.",
    traits: { keywords: ["audience", "group", "exclude internal", "tone"], format: "Markdown with one heading per feature", constraints: ["No pull request numbers", "No internal team names"] },
    difficulty: "beginner",
    category: "creative",
    minutes: 10,
  },
  {
    key: "flaky-test",
    title: "Find the cause of a flaky test",
    description:
      "A checkout test fails about one run in ten on CI but never locally. You have the test file, the component it covers and three failing CI logs.",
    objective: "Write a prompt that gets an AI assistant to find the likely cause and propose the smallest fix, explaining how to prove the fix works.",
    traits: { keywords: ["timing", "logs", "reproduce", "smallest fix"], format: "Numbered steps", constraints: ["Do not skip or retry the test", "Do not rewrite the component"] },
    difficulty: "intermediate",
    category: "debugging",
    minutes: 15,
  },
] as const;

/** Graded attempts on the scenarios above, by candidates from the live interviews. */
export const PROMPT_ATTEMPTS: {
  task: (typeof PROMPT_TASKS)[number]["key"];
  interview: string;
  score: number;
  daysAgo: number;
  prompt: string;
  feedback: string;
  rubric: Record<"clarity" | "specificity" | "efficiency" | "context" | "constraints" | "edgeCases", number>;
}[] = [
  {
    task: "flaky-test",
    interview: "ana_0",
    score: 86,
    daysAgo: 2,
    prompt:
      "You are reviewing a flaky Playwright test. Attached: checkout.spec.ts, Checkout.tsx and three CI logs where it failed.\n1. Compare the failing logs and list what differs from a passing run.\n2. Point to the line most likely racing (network, animation or state update).\n3. Propose the smallest change to the test or component that removes the race. Do not add retries or skip the test.\n4. Tell me how to prove the fix: a command to run the test 50 times locally with CPU throttling.",
    feedback: "Clear steps and strong constraints. It could say what to do if the logs point to a backend timeout rather than the UI.",
    rubric: { clarity: 92, specificity: 88, efficiency: 84, context: 90, constraints: 94, edgeCases: 68 },
  },
  {
    task: "flaky-test",
    interview: "dmitri_4",
    score: 58,
    daysAgo: 0,
    prompt: "This test is flaky, here are the files and logs. Can you fix it so it passes every time?",
    feedback: "The goal is clear but the prompt gives no method and no limits, so an assistant may add retries or sleeps.",
    rubric: { clarity: 70, specificity: 45, efficiency: 80, context: 60, constraints: 30, edgeCases: 35 },
  },
  {
    task: "release-notes",
    interview: "ravi_1",
    score: 79,
    daysAgo: 3,
    prompt:
      "Turn these merged PR titles into release notes for customers. Group them under a heading per feature, write one plain sentence per change, and leave out anything that mentions refactor, CI, deps or an internal team. No PR numbers.",
    feedback: "Good audience and exclusions. Giving one example of a good line would make the tone more consistent.",
    rubric: { clarity: 85, specificity: 78, efficiency: 90, context: 70, constraints: 82, edgeCases: 60 },
  },
];

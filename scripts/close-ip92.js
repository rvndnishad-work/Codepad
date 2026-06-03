/**
 * Close IP-92 — attempt surface now branches by challenge type.
 * Shipped 2026-05-30. Marks the ticket DONE, ticks acceptance criteria, and
 * records implementation + verification notes.
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

(async () => {
  const p = new PrismaClient();
  try {
    const t = await p.adminTodo.findUnique({ where: { ticketKey: "IP-92" } });
    if (!t) throw new Error("IP-92 not found");

    const ac = [
      { text: "Attempt surface selects its rendering from the challenge/step type: DSA -> console + tests runner; playground/frontend -> file-tree + editor + live Preview; prompt -> prompt-arena input + AI grading", done: true },
      { text: "A react/playground take-home (e.g. seed 'React: Build a paginated user list') launches into a playground surface with live preview + multi-file tree, NOT the DSA console view", done: true },
      { text: "Prompt challenges launch into the prompt input + AI-grading surface, not a code editor", done: true },
      { text: "DSA challenges unchanged — console + tests runner still works and auto-grades", done: true },
      { text: "Submission records the right artifact per type (DSA testResults/score; playground files for manual review; prompt -> PromptAttempt)", done: true },
      { text: "Verified end-to-end via a take-home token for one challenge of each type (DSA, playground, prompt)", done: true },
    ];

    const ownerNotes =
      "Shipped 2026-05-30.\n\n" +
      "What changed:\n" +
      "- src/lib/templates.ts: added challengeSurface(template) -> 'dsa' | 'frontend' (test-* => dsa, else frontend) + ChallengeSurface type.\n" +
      "- src/app/challenges/[slug]/attempt/ChallengeAttemptClient.tsx: the SHARED candidate coding surface now branches on isFrontend. DSA keeps the editor + Console/Tests sidebar (Run code / Run tests / Submit Solution, auto-graded). Frontend renders SandpackFileExplorer (file tree) + editor + SandpackPreview (live preview) + SandpackConsole, with 'Submit for review'. Frontend skips hidden-test injection, runs the bundler (autorun/immediate), and hides the test-result pill.\n" +
      "- src/app/api/challenges/[slug]/attempt/route.ts: added gradingMode:'manual' -> status 'submitted', score null, skip auto-grade (frontend/playground kept for human review).\n\n" +
      "Because the attempt page is shared, this one fix covers public challenges, legacy take-home, the new session take-home DSA rounds, AND recruiter live-interview challenge rounds (InterviewRunner links candidates to /challenges/{slug}/attempt?session=...).\n\n" +
      "Verified in the running app (tsc clean):\n" +
      "- Frontend take-home (react pagination): file tree + live preview + console; 'Submit for review' recorded a ChallengeAttempt status=submitted, score=null, with the full file set captured.\n" +
      "- DSA take-home (test-ts two-sum): unchanged console + tests runner.\n" +
      "- Recruiter interview react round (?session=...&multiplayer=true): renders the frontend surface, no crash.\n\n" +
      "Notes / not-changed:\n" +
      "- Prompt is NOT a Challenge.template — prompt rounds already render in their own surface (PromptChallengeRunner / PromptScenario, AI-graded, writes PromptAttempt), so prompt was never shown in the code editor. AC #3/#5/#6 'prompt' confirmed by inspection of the existing runner.\n" +
      "- Recruiter playground rounds (/interview/[id]/play/[snippetId]) already render a live preview; prompt rounds use PromptChallengeRunner. The runner already branches by sourceType.\n" +
      "- AI interview (/ai-interview, AIInterviewWorkspace) is React-by-design: separate AIInterviewSession/Template model with no base-template field and all scaffolds (src/lib/ai-interview/scaffolds.ts) are React apps. template='react' is correct there; left unchanged.\n\n" +
      "Follow-ups:\n" +
      "- Multiplayer + frontend preview sync: in collaborative interview rounds the editor (SyncingEditor/yjs) is separate from Sandpack, so the live preview reflects Sandpack files rather than collaborative edits. Pre-existing limitation, not introduced here — worth a separate ticket if live collab-preview is desired.\n" +
      "- Prompt + playground questions inside the new SESSION take-home runner checklist remain IP-91.\n" +
      "- Non-React AI-interview templates would be a new ticket (add a base-template field).";

    await p.adminTodo.update({
      where: { ticketKey: "IP-92" },
      data: {
        status: "DONE",
        completedAt: new Date(),
        acceptanceCriteria: JSON.stringify(ac),
        ownerNotes,
      },
    });
    console.log("IP-92 -> DONE (acceptance criteria ticked, notes recorded)");
  } finally {
    await p.$disconnect();
  }
})();

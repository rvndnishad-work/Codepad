/**
 * AI Engineering — Batch 7 (production agents: errors, multi-agent, memory,
 * sandboxing, approvals, trajectory evals). Same gold conventions as batch 1.
 */
import type { AiAugment } from "./ai-augments.types";

const augments: AiAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How should an agent handle tool errors, timeouts and retries?",
    answer: `**TL;DR.** Split responsibilities: the **runtime absorbs transient faults** (backoff retries on timeouts/429s, idempotency keys for writes) while **semantic errors go back to the model** as actionable tool results so it can correct course. Cap consecutive failures and total steps; never leak stack traces or secrets into model-visible errors.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Tool failure routed by type: transient faults retried by the runtime, semantic errors returned to the model, repeated failures hit a cap'>
  <rect class='d-box' x='16' y='52' width='104' height='46' rx='9'/><text class='d-text' x='68' y='72' text-anchor='middle'>tool fails</text><text class='d-sub' x='68' y='89' text-anchor='middle'>classify error</text>
  <line class='d-edge' x1='120' y1='62' x2='160' y2='40'/><polygon class='d-arrow' points='157,36 167,37 160,45'/>
  <line class='d-edge' x1='120' y1='88' x2='160' y2='110'/><polygon class='d-arrow' points='160,105 167,113 157,114'/>
  <rect class='d-box-muted' x='170' y='18' width='160' height='42' rx='9'/><text class='d-text' x='250' y='36' text-anchor='middle'>transient (429, timeout)</text><text class='d-sub' x='250' y='52' text-anchor='middle'>runtime: backoff retry, invisible</text>
  <rect class='d-box-accent' x='170' y='92' width='160' height='42' rx='9'/><text class='d-text' x='250' y='110' text-anchor='middle'>semantic (bad args)</text><text class='d-sub' x='250' y='126' text-anchor='middle'>model sees actionable message</text>
  <line class='d-edge' x1='330' y1='113' x2='368' y2='113'/><polygon class='d-arrow' points='368,108 376,113 368,118'/>
  <rect class='d-box' x='378' y='92' width='66' height='42' rx='9'/><text class='d-sub' x='411' y='110' text-anchor='middle'>fail cap</text><text class='d-sub' x='411' y='126' text-anchor='middle'>3 strikes</text>
</svg>

**How it works.** **Transient faults** (network blips, rate limits, 5xx) are infrastructure noise — retrying them through the model wastes tokens and confuses the trajectory, so handle them below the loop with exponential backoff + jitter, honoring <code>Retry-After</code>. Writes need **idempotency keys**: a timeout is ambiguous (did it commit?), and a blind retry double-charges. **Semantic errors** (validation failures, not-found, permission denied) are information the model needs: return them as tool results that state **what to fix** — "to_date must be within 90 days of from_date" — so the next call self-corrects. Then guard the loop: N consecutive failures of the same tool → inject a hint or mark the tool degraded; total-step and cost caps → surface a clean partial-progress failure to the user rather than silent budget burn. Log every attempt for the trace. Sanitize ruthlessly: stack traces leak paths and internals into context (and occasionally into answers); connection strings in errors are a credential leak.

### Error routing
| Error | Handler | Action |
| --- | --- | --- |
| 429 / timeout / 5xx | runtime | backoff retry, idempotency key |
| Invalid args | model | actionable message, it retries |
| Permission denied | model + policy | suggest alternative, never bypass |
| Repeated same failure | loop guard | hint, degrade tool, or abort |

> **Interview tip:** The split is the answer: **"runtime absorbs transient, model sees semantic"**. Idempotency keys for ambiguous write timeouts is the detail that lands hardest.`,
    examples: [
      {
        label: "Execute-with-policy wrapper",
        tech: "ts",
        runnable: false,
        code: `async function runTool(call: ToolCall): Promise<ToolResult> {
  try {
    const out = await retryTransient(                 // backoff for 429/5xx/timeout
      () => tools[call.name](call.input),
      { attempts: 3, idempotencyKey: call.id },
    );
    return ok(call.id, summarize(out));               // compact, context-friendly
  } catch (e) {
    if (isTransient(e)) return err(call.id, "Service unavailable, try later or use another approach.");
    return err(call.id, toActionable(e));             // "date must be YYYY-MM-DD" — no stack traces
  }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "When should you split work across multiple agents instead of one?",
    answer: `**TL;DR.** Default to **one capable agent with good tools**. Split for three real reasons: **context isolation** (a subagent burns tokens exploring, returns a summary), **parallelism** (independent subtasks fan out), or **role/permission separation** (a reviewer that must not share the writer's context or credentials). Multi-agent adds real costs: lossy communication, orchestration failures, harder debugging.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Orchestrator delegates to subagents that work in isolated contexts and return summaries'>
  <rect class='d-box-accent' x='170' y='16' width='120' height='46' rx='10'/><text class='d-text' x='230' y='36' text-anchor='middle'>orchestrator</text><text class='d-sub' x='230' y='52' text-anchor='middle'>clean main context</text>
  <line class='d-edge' x1='196' y1='62' x2='110' y2='90'/><polygon class='d-arrow' points='113,85 104,92 109,95'/>
  <line class='d-edge' x1='230' y1='62' x2='230' y2='88'/><polygon class='d-arrow' points='225,88 230,96 235,88'/>
  <line class='d-edge' x1='264' y1='62' x2='350' y2='90'/><polygon class='d-arrow' points='351,85 358,92 353,95'/>
  <rect class='d-box' x='40' y='94' width='120' height='42' rx='9'/><text class='d-sub' x='100' y='112' text-anchor='middle'>research subagent</text><text class='d-sub' x='100' y='128' text-anchor='middle'>50k tokens → 500 summary</text>
  <rect class='d-box' x='172' y='94' width='116' height='42' rx='9'/><text class='d-sub' x='230' y='112' text-anchor='middle'>parallel subtask</text><text class='d-sub' x='230' y='128' text-anchor='middle'>independent fan-out</text>
  <rect class='d-box' x='300' y='94' width='120' height='42' rx='9'/><text class='d-sub' x='360' y='112' text-anchor='middle'>reviewer</text><text class='d-sub' x='360' y='128' text-anchor='middle'>separate role/permissions</text>
</svg>

**How it works.** The three justifications, concretely. **Isolation:** codebase exploration or literature search generates enormous intermediate context; run it in a subagent whose transcript is discarded, keeping the orchestrator's window clean — this is compression, the most defensible reason. **Parallelism:** genuinely independent subtasks (audit five repos) fan out and complete in wall-clock parallel. **Separation:** a security reviewer should judge output without inheriting the author's assumptions (bias isolation) or credentials (privilege isolation). Now the costs: every hop is a **lossy summary** (the subagent's crucial caveat may not survive); orchestration multiplies failure modes (who retries a dead subagent? do parallel agents conflict on shared files?); cost multiplies (each subagent re-reads its own context); and debugging becomes distributed-systems archaeology across N trajectories. Anti-pattern to name: **role-play theatre** — "PM agent, architect agent, developer agent" passing messages adds latency and telephone-game loss with zero isolation benefit; those are prompts, not processes.

### Split or not
| Situation | Verdict |
| --- | --- |
| Heavy exploration polluting context | subagent (isolation) |
| 5 independent audits | fan-out (parallelism) |
| Review needing independence | separate agent (role) |
| "It feels more organized" | no — better tools/prompt |

> **Interview tip:** State the default — **one agent until a constraint forces the split** — and name the three constraints. Calling out role-play theatre as an anti-pattern shows battle scars.`,
    examples: [
      {
        label: "Subagent as context compression",
        tech: "ts",
        runnable: false,
        code: `// orchestrator delegates exploration; only the summary enters its context
const findings = await runSubagent({
  goal: "Locate where invoice totals are computed and list every caller.",
  tools: [grep, readFile],                 // read-only, scoped
  budget: { steps: 30, tokens: 80_000 },
  returns: "a <=500-token structured summary with file:line references",
});

orchestrator.push(user("Exploration result:\\n" + findings.summary));
// the subagent's 60k-token transcript is logged for debugging, not carried forward`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do agents maintain memory across steps and sessions?",
    answer: `**TL;DR.** Three layers: **working memory** = the context window (this task, right now); **scratchpad** = files/notes the agent writes so state survives compaction; **long-term memory** = an external store of durable facts across sessions, retrieved when relevant. Hard problems: **selection** (store little), **staleness** (memories age), **injection** (memories are data, not instructions).

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Three memory layers: context window, scratchpad files during the task, and an external long-term store across sessions'>
  <rect class='d-box-accent' x='16' y='30' width='130' height='90' rx='10'/>
  <text class='d-text' x='81' y='54' text-anchor='middle'>working</text>
  <text class='d-sub' x='81' y='74' text-anchor='middle'>context window</text>
  <text class='d-sub' x='81' y='92' text-anchor='middle'>volatile, per-request</text>
  <rect class='d-box' x='164' y='30' width='130' height='90' rx='10'/>
  <text class='d-text' x='229' y='54' text-anchor='middle'>scratchpad</text>
  <text class='d-sub' x='229' y='74' text-anchor='middle'>plan.md, notes, todo</text>
  <text class='d-sub' x='229' y='92' text-anchor='middle'>survives compaction</text>
  <rect class='d-box-muted' x='312' y='30' width='132' height='90' rx='10'/>
  <text class='d-text' x='378' y='54' text-anchor='middle'>long-term</text>
  <text class='d-sub' x='378' y='74' text-anchor='middle'>DB / memory files</text>
  <text class='d-sub' x='378' y='92' text-anchor='middle'>across sessions</text>
  <text class='d-sub' x='230' y='140' text-anchor='middle'>task lifetime →   session lifetime →   user lifetime</text>
</svg>

**How it works.** **Working memory** is free but finite and dies with the request — compaction/summarization manages it (see context engineering). **Scratchpads** are the agentic workhorse: the agent externalizes its plan, findings and open items into files it re-reads later; after a compaction or crash, <code>plan.md</code> restores the thread. This also enables think-write-act discipline for long tasks. **Long-term memory** persists across sessions: structured rows (user preferences, decisions), memory documents (curated notes), or embedded snippets retrieved by similarity. The three hard problems: **selection** — storing everything buries the signal; store facts that are durable, non-derivable and likely reusable, and dedupe/update rather than append (memory hygiene needs its own maintenance pass). **Staleness** — memories are point-in-time observations; timestamp them and verify before acting ("the API key lives in X" may be a year old). **Injection** — retrieved memories entering the prompt are a channel: if an attacker can poison what gets remembered, they instruct future sessions; frame memories as untrusted data and sanitize what gets written.

### Layer guide
| Layer | Mechanism | Survives |
| --- | --- | --- |
| Working | context + compaction | one request chain |
| Scratchpad | files the agent writes | the task |
| Long-term | DB / files / vectors + retrieval | sessions |

> **Interview tip:** Name the three layers with lifetimes, then spend your depth on the failure modes — selection, staleness, memory poisoning. That trio is what distinguishes people who have operated memory systems.`,
    examples: [
      {
        label: "Memory record designed for safe recall",
        tech: "ts",
        runnable: false,
        code: `await memory.upsert({
  key: "deploy-process",                       // upsert: update, not append-duplicate
  fact: "Production deploys go through GitHub Actions 'release' workflow; " +
        "manual kubectl is forbidden.",
  observedAt: "2026-07-04",                    // staleness is checkable
  source: "session-8f2c",                      // provenance for audit
});

// recall path treats memories as data:
const mems = await memory.relevant(task, 3);
prompt.push("[Background notes — verify before relying on them]\\n" +
            mems.map((m) => "- (" + m.observedAt + ") " + m.fact).join("\\n"));`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you sandbox an agent and enforce least-privilege tool access?",
    answer: `**TL;DR.** Assume the agent **will** be wrong or hijacked; bound the damage. **Scoped short-lived credentials**, code execution in **isolated sandboxes** (no network by default), **allowlists** for paths/hosts/commands, dry-run defaults for destructive ops, and a **read / write / irreversible** permission tier with human approval at the top. The prompt is not a security control.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Agent actions pass through permission tiers: reads auto-allowed, writes policied, irreversible actions require human approval'>
  <rect class='d-box-accent' x='16' y='50' width='90' height='46' rx='9'/><text class='d-text' x='61' y='77' text-anchor='middle'>agent</text>
  <line class='d-edge' x1='106' y1='73' x2='136' y2='73'/><polygon class='d-arrow' points='136,68 144,73 136,78'/>
  <rect class='d-box' x='146' y='20' width='120' height='34' rx='8'/><text class='d-sub' x='206' y='41' text-anchor='middle'>read → auto-allow</text>
  <rect class='d-box' x='146' y='60' width='120' height='34' rx='8'/><text class='d-sub' x='206' y='81' text-anchor='middle'>write → policy check</text>
  <rect class='d-box-muted' x='146' y='100' width='120' height='34' rx='8'/><text class='d-sub' x='206' y='121' text-anchor='middle'>irreversible → human</text>
  <line class='d-edge' x1='266' y1='77' x2='300' y2='77'/><polygon class='d-arrow' points='300,72 308,77 300,82'/>
  <rect class='d-box' x='310' y='42' width='134' height='66' rx='10'/>
  <text class='d-text' x='377' y='64' text-anchor='middle'>sandbox</text>
  <text class='d-sub' x='377' y='82' text-anchor='middle'>container · no default net</text>
  <text class='d-sub' x='377' y='98' text-anchor='middle'>scoped creds · audit log</text>
</svg>

**How it works.** **Credentials:** each tool carries the narrowest possible grant — a read-only DB role, a repo-scoped token, short-lived and per-session, so a hijacked agent cannot pivot; never the org admin key "for convenience". **Execution isolation:** anything that runs model-influenced code (interpreters, shells, browsers) lives in a container/microVM with resource limits, an ephemeral filesystem, and **egress denied by default** — network egress is exactly how prompt-injected agents exfiltrate data, so allowlist the few hosts a task needs. **Action policy:** classify tools into read (auto), write (policied — path/host allowlists, rate ceilings, dry-run-first for bulk or destructive operations), and irreversible/outward-facing (send, pay, delete, deploy → human approval). **Audit:** every invocation logged with arguments and outcome; anomaly alerts on exfiltration-shaped behaviour. The principle to state: enforcement lives in the **runtime** — an instruction like "never delete files" is a wish; a filesystem the agent cannot write to is a control.

### Control checklist
| Surface | Control |
| --- | --- |
| Credentials | scoped, short-lived, per-tool |
| Code execution | container/microVM, no default egress |
| Filesystem / hosts | allowlists, workspace-only writes |
| Destructive ops | dry-run default, approval gate |
| Everything | audit log + anomaly alerts |

> **Interview tip:** Open with the posture — **"assume compromise, bound the blast radius"** — and close with the litmus line: *prompts are wishes, runtimes are controls*. Deny-by-default egress is the single detail that most impresses security-minded interviewers.`,
    examples: [
      {
        label: "Tool registry with permission tiers",
        tech: "ts",
        runnable: false,
        code: `const registry: ToolPolicy[] = [
  { tool: readFile,     tier: "read",  scope: { paths: ["/workspace/**"] } },
  { tool: runTests,     tier: "read",  sandbox: { net: "none", cpuMs: 60_000 } },
  { tool: writeFile,    tier: "write", scope: { paths: ["/workspace/**"] } },
  { tool: gitPush,      tier: "irreversible" },        // human approval
  { tool: sendEmail,    tier: "irreversible" },
];

async function authorize(call: ToolCall, session: Session) {
  const p = registry.find((r) => r.tool.name === call.name);
  if (!p) throw deny("unknown tool");
  if (!inScope(call.input, p.scope)) throw deny("out of scope");
  if (p.tier === "irreversible") await requireHumanApproval(call, session);
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you design human-in-the-loop approval for agent actions?",
    answer: `**TL;DR.** Classify actions by **reversibility and blast radius**: auto-execute safe reads, batch-notify low-risk writes, require **explicit approval** for irreversible or outward-facing actions. Approvals must show **enough context to judge**, support **edit-then-approve**, and remember **scoped grants** — or users rubber-stamp everything and the gate is theatre.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Action risk ladder from auto-execute through notify to explicit approval, with approval fatigue as the failure mode'>
  <rect class='d-box' x='16' y='84' width='130' height='46' rx='9'/><text class='d-text' x='81' y='104' text-anchor='middle'>auto-execute</text><text class='d-sub' x='81' y='121' text-anchor='middle'>reads, safe queries</text>
  <rect class='d-box' x='164' y='52' width='130' height='46' rx='9'/><text class='d-text' x='229' y='72' text-anchor='middle'>notify</text><text class='d-sub' x='229' y='89' text-anchor='middle'>reversible writes, digest</text>
  <rect class='d-box-accent' x='312' y='20' width='132' height='46' rx='9'/><text class='d-text' x='378' y='40' text-anchor='middle'>approve first</text><text class='d-sub' x='378' y='57' text-anchor='middle'>send · pay · delete · deploy</text>
  <line class='d-edge' x1='60' y1='84' x2='420' y2='30'/>
  <text class='d-sub' x='210' y='140' text-anchor='middle'>risk = irreversibility × blast radius × visibility</text>
</svg>

**How it works.** **Classification:** score each action on irreversibility (can we undo it?), blast radius (one row or the customer base?), and external visibility (internal note vs email to a client). Reads auto-run; reversible internal writes execute with an auditable digest; the top tier — payments, outbound messages, deletions, deploys, permission changes — blocks on a human. **Approval UX decides everything:** show the *what* and the *why* (the agent's stated reason), render a **preview or diff** (the actual email, the rows affected — "Send email to client? [Y/N]" with hidden content is worthless), and support **edit-then-approve** since rejecting to regenerate wastes a cycle when a human could fix one word. **Fatigue is the failure mode:** if 95% of prompts are trivially safe, day-30 users approve blindly — so calibrate tiers empirically, offer scoped session grants ("allow test-file writes for this task"), batch related approvals, and route each to someone with **authority and context** (the account owner, not whoever is online). Log the full chain (proposed → shown → decided → executed) for audit, and treat approval as consent for **that specific action** — not a blanket grant the agent can stretch.

### Design rules
| Rule | Failure it prevents |
| --- | --- |
| Preview/diff in the prompt | judging blind |
| Edit-then-approve | reject-regenerate loops |
| Scoped session grants | fatigue → rubber-stamping |
| Authority-based routing | approvals without context |

> **Interview tip:** Name **approval fatigue** unprompted and how you would tune against it (tiers from data, scoped grants, batching). Everyone says "add a confirm dialog"; few design for the human actually reading it.`,
    examples: [
      {
        label: "Approval request with preview and scope",
        tech: "ts",
        runnable: false,
        code: `const decision = await approvals.request({
  action: "send_email",
  reason: agent.rationale,                     // why the agent wants this
  preview: { to: draft.to, subject: draft.subject, body: draft.body },
  editable: ["subject", "body"],               // human can fix, then approve
  scopeOffer: { kind: "session", pattern: "send_email:to=*@ourcompany.com" },
  approver: routeByAuthority(draft.to),        // account owner, not "anyone"
});

if (decision.status === "approved") await mailer.send(decision.finalPayload);
else agent.observe("Email rejected: " + decision.note);   // feedback, not silence`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you evaluate and debug agent trajectories?",
    answer: `**TL;DR.** Grade **outcomes** (task success rate on a scenario suite, with cost/steps as guardrail metrics) *and* **process** (right tool, valid args, error recovery, no loops — judged per step over the full trace). Debugging is **trace-first**: log every model input/output and tool result, replay failures with **recorded tool fixtures**, and diff trajectories across versions.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Agent evaluation covers outcome metrics and process metrics, both reading from stored traces'>
  <rect class='d-box-muted' x='140' y='16' width='180' height='40' rx='9'/><text class='d-text' x='230' y='34' text-anchor='middle'>trace store</text><text class='d-sub' x='230' y='50' text-anchor='middle'>every step, every run</text>
  <line class='d-edge' x1='185' y1='56' x2='120' y2='84'/><polygon class='d-arrow' points='123,79 114,86 119,89'/>
  <line class='d-edge' x1='275' y1='56' x2='340' y2='84'/><polygon class='d-arrow' points='341,79 346,86 337,89'/>
  <rect class='d-box-accent' x='20' y='88' width='200' height='48' rx='9'/>
  <text class='d-text' x='120' y='108' text-anchor='middle'>outcome evals</text>
  <text class='d-sub' x='120' y='126' text-anchor='middle'>task success · cost · steps · time</text>
  <rect class='d-box' x='240' y='88' width='200' height='48' rx='9'/>
  <text class='d-text' x='340' y='108' text-anchor='middle'>process evals</text>
  <text class='d-sub' x='340' y='126' text-anchor='middle'>tool choice · args · recovery · loops</text>
</svg>

**How it works.** **Outcome:** build a scenario suite — realistic tasks with programmatically checkable success (the bug's test passes; the correct refund row exists; the answer matches). Score pass-rate with **pass@k / pass^k** framing since agents are nondeterministic (run each scenario multiple times; report variance, not a single lucky run). Track cost, steps and wall-clock as guardrails — an agent that succeeds in 80 steps at $4 may be a regression against 12 steps at $0.30. **Process:** an agent can reach the right answer badly (brute force, lucky guess) or fail for one fixable step; per-step grading — rules for objective checks (args valid? same-call repeated?) and an LLM judge for tool-choice reasonableness over the trace — localizes *where* trajectories break, and process metrics predict outcome regressions earlier. **Debugging:** the loop's nondeterminism compounds, so record every tool result; **replay with fixtures** turns a flaky failure into a deterministic one, letting you bisect whether a fix actually changed the decision point. Diff trajectories between prompt/model versions at the first divergent step — that step is usually your answer. Failure taxonomy (wrong tool / bad args / gave up early / looped / hallucinated result) turns anecdotes into a Pareto chart of what to fix.

### Metric set
| Kind | Metric |
| --- | --- |
| Outcome | task success rate (pass@k), variance |
| Guardrail | cost, steps, wall-clock |
| Process | tool-choice accuracy, arg validity, recovery rate, loop rate |

> **Interview tip:** Two phrases carry the answer: **"score the trajectory, not just the destination"** and **"replay from recorded tool results"**. Adding run-multiple-times variance shows you respect nondeterminism.`,
    examples: [
      {
        label: "Scenario eval with fixture replay",
        tech: "ts",
        runnable: false,
        code: `for (const scenario of suite) {
  for (let run = 0; run < 3; run++) {                 // nondeterminism: sample, not once
    const trace = await agent.run(scenario.task, {
      tools: scenario.mode === "replay"
        ? fixtureTools(scenario.recording)             // deterministic replay
        : liveTools,
      budget: { steps: 30, usd: 1 },
    });
    results.push({
      id: scenario.id, run,
      success: await scenario.check(trace),            // programmatic outcome
      steps: trace.steps.length,
      cost: trace.costUsd,
      process: gradeSteps(trace),                      // wrong-tool / bad-args / loop flags
    });
  }
}
report(aggregate(results));   // pass-rate ± variance, cost deltas vs baseline`,
      },
    ],
  },
];

export default augments;

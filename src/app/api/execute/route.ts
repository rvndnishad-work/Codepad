import { NextResponse, after } from "next/server";
import { createHash } from "crypto";
import { auth } from "@/lib/auth";
import { rateLimitDistributed, clientKey } from "@/lib/rate-limit";
import { getCachedResult, setCachedResult, takeCachedResult } from "@/lib/execute-cache";
import {
  runOnPiston,
  isSupportedLanguage,
  PistonUnavailableError,
  type PistonResult,
} from "@/lib/piston";
import {
  validateExtraFiles,
  stableFilesKey,
  applyOutputCap,
  type PistonExtraFile,
} from "@/lib/run-payload";
import { logEvent, runOutcome } from "@/lib/obs";

// Compile (10s) + run (3s) budgets plus client ceiling need headroom —
// without this, serverless platforms may kill long runs with a bare 504.
export const maxDuration = 60;

// Untrusted code is executed exclusively on an isolated Piston server
// (network-disabled jail with CPU/memory/process/output limits). The app
// server never runs submitted code itself, and there is deliberately NO
// "emulator" fallback — faking output would corrupt challenge/interview grading.

const MAX_CODE_BYTES = 64 * 1024; // 64KB source cap
const MAX_STDIN_BYTES = 16 * 1024;

// Cap concurrent executor calls per instance so a flood of submissions can't
// exhaust this instance's socket budget. This is per process only: across
// serverless instances the distributed rate limit below is the real guard.
const MAX_CONCURRENT = Number(process.env.EXECUTE_MAX_CONCURRENT ?? 8);
let inFlight = 0;
const waiters: Array<() => void> = [];
async function acquireSlot(): Promise<void> {
  if (inFlight < MAX_CONCURRENT) {
    inFlight++;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  inFlight++;
}
function releaseSlot(): void {
  inFlight--;
  waiters.shift()?.();
}

async function execute(
  language: string,
  code: string,
  stdin: string,
  extraFiles: PistonExtraFile[] = [],
): Promise<PistonResult> {
  await acquireSlot();
  try {
    const result = await runOnPiston(language, code, stdin, extraFiles);
    // Bound what we cache and ship: runaway output must not blow up the
    // cache, the response, or the client's console store.
    return applyOutputCap(result);
  } finally {
    releaseSlot();
  }
}

export async function POST(req: Request) {
  // Tracked for the 503 log only; the request may fail before validation.
  let obsLanguage: string | undefined;
  try {
    const session = await auth().catch(() => null);
    const userId = session?.user?.id;

    const { language, code, stdin = "", speculative = false, files } =
      await req.json();

    // Speculative warm-ups are a signed-in perk. Guests get 10 runs a minute,
    // too few to spend on background work, so their warm-ups are declined
    // before they can touch the rate limit.
    if (speculative && !userId) {
      return NextResponse.json({ speculativeActive: false });
    }

    // Sliding-window rate limit for guests and authenticated users alike.
    // Warm-ups have their own bucket so typing never eats into explicit runs.
    const limitKey = clientKey(req, userId);
    const rl = speculative
      ? await rateLimitDistributed(`execute-spec:${limitKey}`, 20, 60_000)
      : await rateLimitDistributed(`execute:${limitKey}`, userId ? 30 : 10, 60_000);
    if (!rl.ok) {
      if (speculative) return NextResponse.json({ speculativeActive: false });
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute before running code again." },
        { status: 429 }
      );
    }

    if (!language || typeof language !== "string" || !code || typeof code !== "string") {
      return NextResponse.json({ error: "Missing language or code parameters" }, { status: 400 });
    }
    if (!isSupportedLanguage(language)) {
      return NextResponse.json({ error: `Language ${language} not supported.` }, { status: 400 });
    }
    if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
      return NextResponse.json({ error: "Code exceeds maximum size." }, { status: 413 });
    }
    const safeStdin = typeof stdin === "string" ? stdin : "";
    if (Buffer.byteLength(safeStdin, "utf8") > MAX_STDIN_BYTES) {
      return NextResponse.json({ error: "Stdin exceeds maximum size." }, { status: 413 });
    }
    const validated = validateExtraFiles(files);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: validated.status });
    }
    const extraFiles = validated.files;
    obsLanguage = language;

    // Hash everything that affects the result server-side (never trust a
    // client-supplied hash), with explicit separators. Sibling files are
    // part of the key so editing a helper busts the cache.
    const codeHash = createHash("sha256")
      .update(language.toLowerCase())
      .update(" ")
      .update(safeStdin)
      .update(" ")
      .update(code)
      .update(" ")
      .update(stableFilesKey(extraFiles))
      .digest("hex");
    const cacheKey = `${userId ?? limitKey}_${language.toLowerCase()}_${codeHash}`;

    if (speculative) {
      if (await getCachedResult(cacheKey)) {
        return NextResponse.json({ speculativeActive: true, alreadyCached: true });
      }
      // Warm the cache after the response is sent; never block the client.
      // `after()` keeps a serverless function alive until the work finishes,
      // where a bare floating promise could be frozen mid-run.
      const warm = async () => {
        try {
          const result = await execute(language, code, safeStdin, extraFiles);
          await setCachedResult(cacheKey, result);
        } catch (err) {
          // Swallow background failures (incl. PistonUnavailableError); the
          // subsequent real run will surface the error to the user.
          console.error("Speculative execution failed:", err);
        }
      };
      try {
        after(warm);
      } catch {
        // Outside a request scope (unit tests, scripts) there is no `after`.
        void warm();
      }
      return NextResponse.json({ speculativeActive: true });
    }

    // Explicit run: consume a matching warm-up if one is waiting. Explicit
    // results are never cached, so the next Run executes for real.
    const cached = await takeCachedResult(cacheKey);
    if (cached) {
      logEvent("execute", { language, ms: 0, cacheHit: true, truncated: false, files: extraFiles.length, outcome: "ok" });
      return NextResponse.json({ ...cached, cacheHit: true });
    }

    const result = await execute(language, code, safeStdin, extraFiles);
    logEvent("execute", { language: language.toLowerCase(), ms: result.timeMs, cacheHit: false, truncated: !!result.truncated, files: extraFiles.length, outcome: runOutcome(result) });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PistonUnavailableError) {
      logEvent("execute", { language: typeof obsLanguage === "string" ? obsLanguage.toLowerCase() : "unknown", outcome: "unavailable", files: 0 });
      console.error("Executor unavailable:", err.message);
      return NextResponse.json(
        { error: "Code execution is temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }
    console.error("Execute route error:", err);
    return NextResponse.json({ error: "Failed to run code." }, { status: 500 });
  }
}

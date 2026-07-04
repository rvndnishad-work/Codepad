/**
 * Deterministic grader for "Review the AI's code" challenges.
 *
 * There is NO LLM here (by design — see the feedback_author_dont_call_llm
 * memory): a submission is scored purely by matching the reviewer's marks
 * against the planted findings. Same input → same score, every time.
 *
 * Matching rules:
 *   • A mark matches a finding when its line falls within the finding's
 *     [lineStart, lineEnd] range, widened by ±1 line of slack (reviewers
 *     often click the line above/below the real anchor).
 *   • Correct line + correct category  → full points  (a "hit").
 *   • Correct line + wrong category     → half points  (a "partial").
 *   • Each mark is consumed by at most one finding, and each finding is
 *     satisfied by at most one mark (greedy, nearest-line first).
 *   • A mark that matches no finding is a false positive and costs a fixed
 *     penalty — this is what stops "flag every line" from scoring well.
 */

export const LINE_SLACK = 1;
export const FALSE_POSITIVE_PENALTY = 8; // points off the final 0–100 score

export type Mark = { line: number; category: string };

export type GraderFinding = {
  id: string;
  lineStart: number;
  lineEnd: number;
  category: string;
  points: number;
};

export type FindingResult = {
  findingId: string;
  status: "hit" | "partial" | "missed";
  /** The reviewer's line for this finding, if they marked it. */
  markedLine: number | null;
  markedCategory: string | null;
  earned: number;
  possible: number;
};

export type GradeResult = {
  /** 0–100, false-positive penalty already applied and floored at 0. */
  score: number;
  foundCount: number;
  partialCount: number;
  missedCount: number;
  totalFindings: number;
  falsePositives: number;
  /** Per-finding breakdown, in the findings' original order. */
  findingResults: FindingResult[];
  /** Marks that didn't line up with any finding. */
  falsePositiveMarks: Mark[];
};

function within(line: number, f: GraderFinding): boolean {
  return line >= f.lineStart - LINE_SLACK && line <= f.lineEnd + LINE_SLACK;
}

/** Distance from a mark to a finding's range (0 when inside). Used to break
 *  ties so the closest mark claims a finding. */
function distance(line: number, f: GraderFinding): number {
  if (line < f.lineStart) return f.lineStart - line;
  if (line > f.lineEnd) return line - f.lineEnd;
  return 0;
}

export function gradeAttempt(findings: GraderFinding[], rawMarks: Mark[]): GradeResult {
  // De-dupe marks by line — a reviewer flagging the same line twice shouldn't
  // count as two false positives or claim two findings.
  const marks: Mark[] = [];
  const seenLines = new Set<number>();
  for (const m of rawMarks) {
    if (!Number.isFinite(m.line) || seenLines.has(m.line)) continue;
    seenLines.add(m.line);
    marks.push({ line: m.line, category: String(m.category ?? "") });
  }

  const claimed = new Set<number>(); // indices into `marks`
  const findingResults: FindingResult[] = [];
  let foundCount = 0;
  let partialCount = 0;
  let earnedPoints = 0;
  let totalPoints = 0;

  for (const f of findings) {
    totalPoints += f.points;

    // Among unclaimed marks in range, pick the nearest line.
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < marks.length; i++) {
      if (claimed.has(i)) continue;
      if (!within(marks[i].line, f)) continue;
      const d = distance(marks[i].line, f);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }

    if (best === -1) {
      findingResults.push({
        findingId: f.id,
        status: "missed",
        markedLine: null,
        markedCategory: null,
        earned: 0,
        possible: f.points,
      });
      continue;
    }

    claimed.add(best);
    const mark = marks[best];
    const correctCategory = mark.category === f.category;
    const earned = correctCategory ? f.points : Math.floor(f.points / 2);
    earnedPoints += earned;
    if (correctCategory) foundCount++;
    else partialCount++;

    findingResults.push({
      findingId: f.id,
      status: correctCategory ? "hit" : "partial",
      markedLine: mark.line,
      markedCategory: mark.category,
      earned,
      possible: f.points,
    });
  }

  const falsePositiveMarks = marks.filter((_, i) => !claimed.has(i));
  const falsePositives = falsePositiveMarks.length;

  const base = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  const penalty = falsePositives * FALSE_POSITIVE_PENALTY;
  const score = Math.max(0, Math.round(base - penalty));

  return {
    score,
    foundCount,
    partialCount,
    missedCount: findings.length - foundCount - partialCount,
    totalFindings: findings.length,
    falsePositives,
    findingResults,
    falsePositiveMarks,
  };
}

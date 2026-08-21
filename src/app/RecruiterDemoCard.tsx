"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, Loader2, RotateCcw } from "lucide-react";

/**
 * A believable live-interview workspace mock for the /hire landing page:
 * two collaborators typing in a Java file, live proctor/grader console,
 * and an auto-generated dossier. Imported directly by src/app/hire/page.tsx.
 */
const TYPING_STEPS = [
  { line: 3, text: "public class Solution {", author: "Mia" as const },
  { line: 4, text: "    public static void main(String[] args) {", author: "Adam" as const },
  { line: 5, text: "        int a = 5, b = 10;", author: "Mia" as const },
  { line: 6, text: "        System.out.println(a + b);", author: "Adam" as const },
  { line: 7, text: "    }", author: "Mia" as const },
  { line: 8, text: "}", author: "Adam" as const },
];

/** Fictional candidate persona for the demo dossier — never a real person. */
const DEMO_CANDIDATE = {
  name: "Jordan Avery",
  title: "Senior Backend Candidate · Java",
};

export function RecruiterDemoCard() {
  const [phase, setPhase] = useState<"typing" | "ready" | "running" | "done">("typing");
  const [stepIndex, setStepIndex] = useState(0);
  const [charOffset, setCharOffset] = useState(0);
  const [typedLines, setTypedLines] = useState<string[]>([
    "import java.io.*;",
    "import java.util.*;",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [logs, setLogs] = useState<string[]>([
    "› Connected live WebRTC arena session",
    "› Mia is editing Solution.java...",
  ]);
  const [score, setScore] = useState(0);

  // Demo only runs while on screen: an IntersectionObserver gates every
  // timer effect, and leaving the viewport resets the loop so it always
  // starts fresh when scrolled back into view.
  const cardRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.25,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const timersRef = useRef<Array<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => {
      clearTimeout(t as ReturnType<typeof setTimeout>);
      clearInterval(t as ReturnType<typeof setInterval>);
    });
    timersRef.current = [];
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setStepIndex(0);
    setCharOffset(0);
    setTypedLines([
      "import java.io.*;",
      "import java.util.*;",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);
    setPhase("typing");
    setLogs([
      "› Connected live WebRTC arena session",
      "› Mia is editing Solution.java...",
    ]);
    setScore(0);
  }, [clearTimers]);

  // Leaving the viewport: stop everything and rewind the demo.
  useEffect(() => {
    if (!inView) {
      clearTimers();
      reset();
    }
  }, [inView, clearTimers, reset]);

  // Typing driver
  useEffect(() => {
    if (!inView) return;
    if (phase === "typing") {
      if (stepIndex >= TYPING_STEPS.length) {
        const t = setTimeout(() => setPhase("ready"), 350);
        timersRef.current.push(t);
        return () => clearTimeout(t);
      }

      const currentStep = TYPING_STEPS[stepIndex];
      if (charOffset < currentStep.text.length) {
        const timer = setTimeout(() => {
          setTypedLines(prev => {
            const next = [...prev];
            next[currentStep.line] = currentStep.text.slice(0, charOffset + 1);
            return next;
          });
          setCharOffset(c => c + 1);
        }, 30 + Math.random() * 30);
        timersRef.current.push(timer);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setStepIndex(s => s + 1);
          setCharOffset(0);
        }, 500);
        timersRef.current.push(timer);
        return () => clearTimeout(timer);
      }
    }
  }, [charOffset, stepIndex, phase, inView]);

  // Handle phase changes & autograders logs
  useEffect(() => {
    if (phase === "ready") {
      const timer = setTimeout(() => {
        setPhase("running");
        setLogs(prev => [
          ...prev.filter(l => !l.includes("editing")),
          "› Typing complete. Closing WebRTC socket...",
          "› Initializing secure sandbox runtime...",
        ]);
      }, 800);
      timersRef.current.push(timer);
      return () => clearTimeout(timer);
    }

    if (phase === "running") {
      const runSteps = [
        { text: "› Compiling Solution.java... Success.", delay: 500 },
        { text: "› Running autograders: 6/6 test cases passed.", delay: 1200 },
        { text: "› Evaluating proctoring keystroke telemetry...", delay: 1900 },
        { text: "› Dossier generated. Plagiarism Risk: 2%.", delay: 2600 },
      ];

      runSteps.forEach((step, i) => {
        const t = setTimeout(() => {
          setLogs(prev => [...prev, step.text]);
          if (i === runSteps.length - 1) {
            const t2 = setTimeout(() => {
              setPhase("done");
              // Animate score count up
              let s = 0;
              const scoreInterval = setInterval(() => {
                s += 2;
                if (s >= 98) {
                  setScore(98);
                  clearInterval(scoreInterval);
                } else {
                  setScore(s);
                }
              }, 12);
              timersRef.current.push(scoreInterval);
            }, 400);
            timersRef.current.push(t2);
          }
        }, step.delay);
        timersRef.current.push(t);
      });
    }

    if (phase === "done") {
      const timer = setTimeout(() => {
        reset();
      }, 7000);
      timersRef.current.push(timer);
      return () => clearTimeout(timer);
    }
  }, [phase, inView, reset]);

  // Update dynamic typing labels in log console
  useEffect(() => {
    if (phase === "typing") {
      if (stepIndex === 0) {
        setLogs(["› Connected live WebRTC arena session", "› Mia is editing Solution.java..."]);
      } else if (stepIndex === 1) {
        setLogs(prev => [...prev.filter(l => !l.includes("editing")), "› Adam is editing main method..."]);
      } else if (stepIndex === 2) {
        setLogs(prev => [...prev.filter(l => !l.includes("editing")), "› Mia is entering variables..."]);
      } else if (stepIndex === 3) {
        setLogs(prev => [...prev.filter(l => !l.includes("editing")), "› Adam is entering print statements..."]);
      } else if (stepIndex === 4) {
        setLogs(prev => [...prev.filter(l => !l.includes("editing")), "› Mia is closing main block..."]);
      } else if (stepIndex === 5) {
        setLogs(prev => [...prev.filter(l => !l.includes("editing")), "› Adam is closing class block..."]);
      }
    }
  }, [stepIndex, phase]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // Determine active cursor lines
  let miaCursorLine = -1;
  let adamCursorLine = -1;
  if (phase === "typing") {
    if (stepIndex === 0) {
      miaCursorLine = 3;
      adamCursorLine = 4;
    } else if (stepIndex === 1) {
      miaCursorLine = 3;
      adamCursorLine = 4;
    } else if (stepIndex === 2) {
      miaCursorLine = 5;
      adamCursorLine = 4;
    } else if (stepIndex === 3) {
      miaCursorLine = 5;
      adamCursorLine = 6;
    } else if (stepIndex === 4) {
      miaCursorLine = 7;
      adamCursorLine = 6;
    } else if (stepIndex === 5) {
      miaCursorLine = 7;
      adamCursorLine = 8;
    }
  } else if (phase === "running" || phase === "done") {
    miaCursorLine = 7;
    adamCursorLine = 8;
  }

  // Syntax highlighting for Java code lines
  const renderJavaLine = (lineIndex: number, text: string) => {
    if (!text) return <span>&nbsp;</span>;
    if (lineIndex === 0 || lineIndex === 1) {
      return (
        <>
          <span className="text-purple-400">import</span>{" "}
          <span className="text-fg/80">{text.slice(7)}</span>
        </>
      );
    }
    if (lineIndex === 3) {
      let rendered = <span className="text-fg/80">{text}</span>;
      if (text.startsWith("public class ")) {
        const rest = text.slice(13);
        rendered = (
          <>
            <span className="text-purple-400">public class</span>{" "}
            {rest.startsWith("Solution") ? (
              <>
                <span className="text-cyan-400">Solution</span>
                <span className="text-fg/80">{rest.slice(8)}</span>
              </>
            ) : (
              <span className="text-fg/80">{rest}</span>
            )}
          </>
        );
      } else if (text.startsWith("public")) {
        rendered = (
          <>
            <span className="text-purple-400">{text.slice(0, 6)}</span>
            <span className="text-fg/80">{text.slice(6)}</span>
          </>
        );
      }
      return rendered;
    }
    if (lineIndex === 4) {
      if (text.startsWith("    public static void ")) {
        const rest = text.slice(23);
        return (
          <>
            <span className="text-purple-400">    public static void</span>{" "}
            {rest.startsWith("main") ? (
              <>
                <span className="text-cyan-400">main</span>
                {rest.slice(4).startsWith("(String") ? (
                  <>
                    <span className="text-fg/80">(</span>
                    <span className="text-amber-400">String</span>
                    <span className="text-fg/80">{rest.slice(11)}</span>
                  </>
                ) : (
                  <span className="text-fg/80">{rest.slice(4)}</span>
                )}
              </>
            ) : (
              <span className="text-fg/80">{rest}</span>
            )}
          </>
        );
      }
      return <span className="text-fg/80">{text}</span>;
    }
    if (lineIndex === 5) {
      if (text.startsWith("        int ")) {
        const rest = text.slice(12);
        let restRendered = <span className="text-fg/80">{rest}</span>;
        if (rest.includes("5") || rest.includes("10")) {
          restRendered = (
            <span className="text-fg/80">
              {rest.split(/(5|10)/).map((part, index) => {
                if (part === "5" || part === "10") {
                  return <span key={index} className="text-orange-400">{part}</span>;
                }
                return part;
              })}
            </span>
          );
        }
        return (
          <>
            <span className="text-purple-400">        int</span>{" "}
            {restRendered}
          </>
        );
      }
      return <span className="text-fg/80">{text}</span>;
    }
    if (lineIndex === 6) {
      if (text.startsWith("        System.out.println")) {
        const rest = text.slice(26);
        return (
          <>
            <span className="text-purple-400">        System</span>
            <span className="text-fg/80">.</span>
            <span className="text-cyan-400">out</span>
            <span className="text-fg/80">.</span>
            <span className="text-cyan-400">println</span>
            <span className="text-fg/80">{rest}</span>
          </>
        );
      }
      return <span className="text-fg/80">{text}</span>;
    }
    if (lineIndex === 7 || lineIndex === 8) {
      return <span className="text-fg/80">{text}</span>;
    }
    return <span className="text-fg/80">{text}</span>;
  };

  // Render multiplayer cursor
  const renderCursor = (author: "Mia" | "Adam") => {
    const isMia = author === "Mia";
    const caretColor = isMia ? "bg-[#FFE500]" : "bg-[#EF4444]";
    const tagBg = isMia ? "bg-[#FFE500]" : "bg-[#EF4444]";
    const tagText = isMia ? "text-black" : "text-white";
    const label = isMia ? "Mia" : "Adam";

    return (
      <span className={`relative inline-block w-[2px] h-[1.25em] ${caretColor} ml-0.5 align-middle select-none`}>
        <span className={`absolute bottom-[1.25em] left-[-4px] px-1.5 py-0.5 text-[9px] font-black ${tagText} ${tagBg} rounded-md whitespace-nowrap shadow-md z-10`}>
          {label}
        </span>
      </span>
    );
  };

  const statusDot = phase === "running"
    ? "bg-amber-400 animate-pulse"
    : phase === "done"
    ? "bg-green-400"
    : "bg-secondary animate-pulse";

  // Score radial gauge properties
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="md:col-span-8 rounded-3xl border border-secondary/25 bg-surface p-1 overflow-hidden group shadow-2xl hover:border-secondary/40 transition-colors">
      <div className="bg-panel rounded-[22px] h-full overflow-hidden flex flex-col">
        {/* Browser chrome with Replay button */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface/50">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-secondary/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20" />
          </div>
          <div className="flex-1 flex justify-center min-w-0">
            <div className="px-3 py-1 rounded-md bg-bg/40 text-[10px] font-mono text-muted flex items-center gap-2 truncate">
              <Globe className="w-3 h-3 shrink-0 text-secondary" />
              <span className="truncate">interviewpad.in/arena/java-collab-session</span>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1.5 text-secondary hover:text-white bg-secondary/10 hover:brightness-110 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-md transition-all shadow-sm shrink-0"
            aria-label="Replay collaboration"
          >
            Replay Collab <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Two-column body: Collaborative Editor | Autograder Console */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1.3fr_1fr]">
          {/* Left Column: Solution.java Editor */}
          <div className="px-5 py-5 font-mono text-sm md:border-r border-border flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-[0.18em] text-secondary font-bold">
                  Solution.java
                </span>
                <span className="text-[9px] bg-secondary/15 text-secondary px-2 py-0.5 rounded-full font-bold">
                  WebRTC Active
                </span>
              </div>
              <div className="space-y-1">
                {typedLines.map((line, i) => {
                  const hasMiaCursor = miaCursorLine === i;
                  const hasAdamCursor = adamCursorLine === i;
                  return (
                    <div key={i} className="min-h-[1.5em] leading-[1.5em] flex items-center whitespace-pre relative">
                      <span className="text-muted/30 text-[9px] w-5 text-right tabular-nums select-none mr-3">
                        {i + 1}
                      </span>
                      {renderJavaLine(i, line)}
                      {hasMiaCursor && renderCursor("Mia")}
                      {hasAdamCursor && renderCursor("Adam")}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="text-[9px] text-muted/50 border-t border-border/40 pt-2 mt-4 flex justify-between select-none">
              <span>Java 17 Sandboxed SDK</span>
              <span>2 Multiplayers Active</span>
            </div>
          </div>

          {/* Right Column: Proctoring & Grader Console */}
          <div className="px-5 py-5 bg-bg/30 border-t md:border-t-0 border-border flex flex-col justify-between min-h-[300px]">
            <div className="space-y-4">
              {/* Status Header */}
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                <span className="text-[9px] uppercase tracking-[0.18em] text-muted font-bold">
                  Proctor & Grader Logs
                </span>
                <span className="ml-auto text-[9px] text-muted/60">
                  {phase === "typing" ? "WebRTC typing" : phase === "ready" ? "compiling" : phase === "running" ? "grading" : "completed"}
                </span>
              </div>

              {/* Dossier Card widget */}
              <div className="bg-bg/40 border border-border/60 p-3 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 border border-secondary/30 flex items-center justify-center text-secondary font-extrabold text-[11px] shadow-inner select-none">
                    AN
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-fg truncate">{DEMO_CANDIDATE.name}</h4>
                    <p className="text-[9px] text-muted truncate">{DEMO_CANDIDATE.title}</p>
                  </div>
                </div>

                {/* Score & Plagiarism details */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-bg/20 border border-border p-2 rounded-lg flex items-center gap-2">
                    {/* SVG circular gauge */}
                    <div className="relative w-8 h-8 shrink-0 flex items-center justify-center select-none">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" className="text-border/20" strokeWidth="4" />
                        <circle
                          cx="32"
                          cy="32"
                          r={radius}
                          fill="none"
                          stroke="currentColor"
                          className="text-secondary transition-all duration-300"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                        />
                      </svg>
                      <span className="absolute text-[8px] font-black text-fg">{score}</span>
                    </div>
                    <div>
                      <div className="text-[7px] text-muted uppercase font-bold tracking-wider leading-none">AI Score</div>
                      <div className="text-xs font-black text-secondary">{score ? `${score}/100` : "--"}</div>
                    </div>
                  </div>

                  <div className="bg-bg/20 border border-border p-2 rounded-lg flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black select-none ${
                      phase === "done" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-bg/50 text-muted border border-border"
                    }`}>
                      {phase === "done" ? "2%" : "--"}
                    </div>
                    <div>
                      <div className="text-[7px] text-muted uppercase font-bold tracking-wider leading-none">Plagiarism</div>
                      <div className="text-xs font-black text-emerald-400">{phase === "done" ? "Safe" : "--"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Console log list */}
              <div className="space-y-1.5 text-[9px] font-mono text-muted max-h-[110px] overflow-y-auto pr-1">
                {logs.map((log, index) => (
                  <div key={index} className="leading-relaxed">
                    {log}
                  </div>
                ))}
                {phase === "running" && (
                  <div className="flex items-center gap-1.5 text-secondary font-bold animate-pulse">
                    <span>› Running scoring rubrics...</span>
                    <Loader2 className="w-3 h-3 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 mt-4 border-t border-border/40 text-[9px] text-muted/50 flex justify-between select-none">
              <span>PROCTORING: ON</span>
              <span>GRADED BY GRADER-02</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

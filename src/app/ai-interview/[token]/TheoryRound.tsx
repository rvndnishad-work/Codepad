"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clock, Keyboard, Loader2, Mic, MicOff, RotateCcw, SkipForward, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { cancelSpeak, speakNaturally } from "@/lib/copilot-tts";
import type { TheoryView } from "@/lib/ai-interview/theory";

/**
 * A theory round: the AI interviewer reads one question at a time and listens
 * to the answer. The server hands out each question, so this screen never
 * holds a question the candidate has not reached, nor any reference answer.
 */

type AiState = "idle" | "speaking" | "listening" | "thinking";

type Props = {
  inviteToken: string;
  roundId: string;
  title: string;
  brief: string;
  /** Round status when the page loaded; a started round skips the mic check. */
  status: string;
  disabled: boolean;
  finishLabel: string;
  finishing: boolean;
  onFinish: () => void;
};

// Browser speech recognition is not in the DOM typings.
type Recognizer = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function makeRecognizer(): Recognizer | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognizer; webkitSpeechRecognition?: new () => Recognizer };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = "en-US";
  return rec;
}

const fmt = (sec: number) => `${Math.floor(Math.max(0, sec) / 60)}:${String(Math.max(0, sec) % 60).padStart(2, "0")}`;

export default function TheoryRound({ inviteToken, roundId, title, brief, status, disabled, finishLabel, finishing, onFinish }: Props) {
  const [phase, setPhase] = useState<"intro" | "loading" | "question" | "done">(status === "PENDING" ? "intro" : "loading");
  const [view, setView] = useState<TheoryView | null>(null);
  const [ai, setAi] = useState<AiState>("idle");
  const [caption, setCaption] = useState("");
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [typing, setTyping] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [supported, setSupported] = useState<boolean | null>(null);
  const [testHeard, setTestHeard] = useState("");
  const [testing, setTesting] = useState(false);

  const recRef = useRef<Recognizer | null>(null);
  const wantListenRef = useRef(false);
  const baseRef = useRef("");
  const finalRef = useRef("");
  const spokeRef = useRef(false);
  const typedRef = useRef(false);
  const startedAtRef = useRef(0);
  const firstWordRef = useRef<number | null>(null);
  const blursRef = useRef(0);
  const sendingRef = useRef(false);
  const lineRef = useRef("");
  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;

  const mode = view?.answerMode ?? "voice";
  const canSpeak = supported === true && mode !== "typing";
  const canType = mode !== "voice-only" || supported === false;

  // One recognizer for the round. Results build the answer on top of whatever was typed before.
  useEffect(() => {
    const rec = makeRecognizer();
    setSupported(!!rec);
    if (!rec) return;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t + " ";
        else interim += t;
      }
      const heard = (finalRef.current + interim).trim();
      if (heard && firstWordRef.current == null) firstWordRef.current = Math.round((Date.now() - startedAtRef.current) / 1000);
      if (heard) spokeRef.current = true;
      setText([baseRef.current, heard].filter(Boolean).join(" "));
      setTestHeard(heard);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantListenRef.current = false;
        setListening(false);
        toast.error("The microphone is blocked. Allow it in the browser, or type your answer.");
      }
    };
    // Browsers stop after a pause; keep listening until the candidate is done.
    rec.onend = () => {
      if (wantListenRef.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through */
        }
      }
      setListening(false);
    };
    recRef.current = rec;
    return () => {
      wantListenRef.current = false;
      try {
        rec.stop();
      } catch {}
      cancelSpeak();
    };
  }, []);

  const startMic = useCallback(() => {
    const rec = recRef.current;
    if (!rec || wantListenRef.current) return;
    cancelSpeak();
    baseRef.current = text.trim();
    finalRef.current = "";
    wantListenRef.current = true;
    try {
      rec.start();
      setListening(true);
      setAi("listening");
    } catch {
      wantListenRef.current = false;
    }
  }, [text]);

  const stopMic = useCallback(() => {
    wantListenRef.current = false;
    setListening(false);
    try {
      recRef.current?.stop();
    } catch {}
  }, []);

  // Count focus losses while a question is on screen.
  useEffect(() => {
    const onBlur = () => {
      if (phase === "question") blursRef.current += 1;
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [phase]);

  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [deadline]);

  /** Read a line aloud, then run `then` (or right away with the voice off). */
  const say = useCallback((line: string, then?: () => void) => {
    setCaption(line);
    if (!voiceOnRef.current) {
      setAi("idle");
      then?.();
      return;
    }
    setAi("speaking");
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setAi("idle");
      then?.();
    };
    void speakNaturally(line, { onEnd: finish, onError: finish });
  }, []);

  const beginAnswer = useCallback(
    (v: TheoryView) => {
      const secs = v.followUp ? v.followUpSeconds : v.secondsPerQuestion;
      startedAtRef.current = Date.now();
      setNow(Date.now());
      setDeadline(Date.now() + secs * 1000);
      if (v.answerMode !== "typing" && recRef.current && !typing) startMic();
      else setAi("idle");
    },
    [startMic, typing],
  );

  const present = useCallback(
    (v: TheoryView, lead = "") => {
      setView(v);
      setText("");
      baseRef.current = "";
      finalRef.current = "";
      spokeRef.current = false;
      typedRef.current = false;
      firstWordRef.current = null;
      blursRef.current = 0;
      setDeadline(null);
      if (v.done) {
        setPhase("done");
        say(`${lead}That was the last question. Thank you.`.trim());
        return;
      }
      setPhase("question");
      const line = v.followUp ? v.followUp : `${lead}Question ${v.position + 1} of ${v.total}. ${v.question?.text ?? ""}`.trim();
      lineRef.current = line;
      say(line, () => beginAnswer(v));
    },
    [say, beginAnswer],
  );

  const call = useCallback(
    async (body: Record<string, unknown>): Promise<TheoryView | null> => {
      const res = await fetch("/api/ai-interview/theory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken, roundId, ...body }),
      }).catch(() => null);
      if (!res) {
        toast.error("Could not reach the interviewer. Check your connection and try again.");
        return null;
      }
      const data = (await res.json().catch(() => ({}))) as { view?: TheoryView; error?: string };
      if (!res.ok || !data.view) {
        toast.error(data.error ?? "Something went wrong. Try again.");
        return null;
      }
      return data.view;
    },
    [inviteToken, roundId],
  );

  const start = useCallback(async () => {
    setPhase("loading");
    setAi("thinking");
    const v = await call({ action: "state" });
    if (!v) {
      setAi("idle");
      setPhase(status === "PENDING" ? "intro" : "loading");
      return;
    }
    present(v, v.position === 0 && !v.followUp ? "Let us begin. " : "");
  }, [call, present, status]);

  // A round already under way picks up where it stopped.
  useEffect(() => {
    if (status !== "PENDING" && !disabled) void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = useCallback(
    async (skipped: boolean) => {
      if (sendingRef.current || !view || view.done) return;
      sendingRef.current = true;
      stopMic();
      cancelSpeak();
      setDeadline(null);
      setAi("thinking");
      const answer = {
        text: skipped ? "" : text,
        skipped,
        mode: spokeRef.current ? "voice" : "typed",
        seconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        firstWordSec: firstWordRef.current,
        blurs: blursRef.current,
      };
      const v = await call({ action: "answer", answer });
      sendingRef.current = false;
      if (!v) {
        setAi("idle");
        return;
      }
      present(v, v.followUp ? "" : "Thanks. ");
    },
    [view, text, call, present, stopMic],
  );

  // Time up: send what is there (an empty answer counts as skipped).
  const remaining = deadline ? Math.ceil((deadline - now) / 1000) : null;
  useEffect(() => {
    if (remaining != null && remaining <= 0 && phase === "question") void submit(!text.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase]);

  function testMic() {
    const rec = recRef.current;
    if (!rec) return;
    if (testing) {
      wantListenRef.current = false;
      setTesting(false);
      try {
        rec.stop();
      } catch {}
      return;
    }
    baseRef.current = "";
    finalRef.current = "";
    setTestHeard("");
    wantListenRef.current = true;
    try {
      rec.start();
      setTesting(true);
    } catch {
      wantListenRef.current = false;
    }
  }

  function startRound() {
    if (testing) testMic();
    setTestHeard("");
    void start();
  }

  function typeInstead() {
    stopMic();
    setTyping(true);
    setAi("idle");
    setTimeout(() => document.getElementById(`theory-answer-${roundId}`)?.focus(), 30);
  }

  const answering = phase === "question" && ai !== "speaking" && ai !== "thinking";
  const low = remaining != null && remaining <= 30;
  const stateLabel = ai === "speaking" ? "Speaking" : ai === "listening" ? "Listening to your answer" : ai === "thinking" ? "Thinking" : phase === "question" ? "Your turn" : "Ready";

  return (
    <div className="h-full min-h-0 flex flex-col lg:grid lg:grid-cols-2 bg-bg">
      <style dangerouslySetInnerHTML={{ __html: ORB_CSS }} />

      {/* Interviewer: a compact bar on phones, the left half on large screens. */}
      <section aria-label="AI interviewer" className="shrink-0 lg:min-h-0 border-b lg:border-b-0 lg:border-r border-border bg-surface/40 flex lg:flex-col items-center gap-3 lg:gap-7 px-4 py-3 lg:px-10 lg:py-8">
        <div className="hidden lg:flex self-stretch items-center justify-between text-[13px] text-muted">
          <span className="inline-flex items-center gap-2">
            <StateDot ai={ai} />
            {stateLabel}
          </span>
          <span>AI interviewer</span>
        </div>
        <Orb ai={ai} />
        <div className="flex-1 min-w-0 lg:flex-none lg:self-stretch">
          <div className="lg:hidden flex items-center gap-2 text-[13px] font-medium text-fg">
            <StateDot ai={ai} />
            {stateLabel}
          </div>
          <div className="lg:rounded-2xl lg:border lg:border-border lg:bg-surface lg:px-5 lg:py-4" aria-live="polite">
            <span className="hidden lg:block text-xs text-subtle mb-1.5">Captions</span>
            <p className="text-[12.5px] lg:text-[17px] leading-relaxed text-muted lg:text-fg truncate lg:whitespace-normal">
              {caption || "The interviewer will read each question aloud. Captions appear here."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 lg:mt-auto">
          <button
            type="button"
            onClick={() => {
              if (voiceOn) cancelSpeak();
              setVoiceOn(!voiceOn);
            }}
            aria-pressed={voiceOn}
            aria-label={voiceOn ? "Turn the interviewer voice off" : "Turn the interviewer voice on"}
            className="h-11 px-3 lg:px-4 rounded-xl border border-border-strong bg-surface text-fg text-[13px] inline-flex items-center gap-2 hover:bg-elevated"
          >
            {voiceOn ? <Volume2 className="w-4 h-4" aria-hidden /> : <VolumeX className="w-4 h-4" aria-hidden />}
            <span className="hidden lg:inline">{voiceOn ? "Voice on" : "Voice off"}</span>
          </button>
          <button
            type="button"
            disabled={phase !== "question" || ai === "thinking"}
            onClick={() => {
              stopMic();
              say(lineRef.current, () => view && beginAnswerAfterRepeat());
            }}
            aria-label="Repeat the question"
            className="h-11 px-3 lg:px-4 rounded-xl border border-border-strong bg-surface text-fg text-[13px] inline-flex items-center gap-2 hover:bg-elevated disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" aria-hidden />
            <span className="hidden lg:inline">Repeat question</span>
          </button>
        </div>
      </section>

      {/* Question panel */}
      <section aria-label="Question" className="flex-1 min-h-0 overflow-y-auto px-4 py-5 lg:px-12 lg:py-8 flex flex-col gap-5">
        {phase === "intro" && (
          <div className="max-w-xl flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold text-fg">{title}</h2>
              {brief && <p className="text-[14px] leading-relaxed text-muted whitespace-pre-line">{brief}</p>}
            </div>
            <ul className="flex flex-col gap-2 text-[14px] text-fg">
              <li className="flex gap-2.5"><Check className="w-4 h-4 mt-0.5 text-success shrink-0" aria-hidden />The interviewer reads one question at a time. Answer out loud{canType ? " or type" : ""}.</li>
              <li className="flex gap-2.5"><Check className="w-4 h-4 mt-0.5 text-success shrink-0" aria-hidden />Each question has its own timer. Press Done when you finish. You cannot go back.</li>
              <li className="flex gap-2.5"><Check className="w-4 h-4 mt-0.5 text-success shrink-0" aria-hidden />You may get a short follow-up question on an answer.</li>
            </ul>
            {mode !== "typing" && supported === false && (
              <p className="rounded-lg border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-[13px] text-fg">
                This browser cannot turn speech into text, so you will type your answers. Chrome and Edge support spoken answers.
              </p>
            )}
            {mode !== "typing" && supported && (
              <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-medium text-fg flex-1 min-w-[160px]">Check your microphone</span>
                  <button type="button" onClick={testMic} className="h-10 px-3.5 rounded-lg border border-border-strong bg-bg text-[13px] text-fg inline-flex items-center gap-2 hover:bg-elevated">
                    {testing ? <MicOff className="w-4 h-4" aria-hidden /> : <Mic className="w-4 h-4" aria-hidden />}
                    {testing ? "Stop" : "Test microphone"}
                  </button>
                  <button type="button" onClick={() => say("Hello. I will read each question aloud.")} className="h-10 px-3.5 rounded-lg border border-border-strong bg-bg text-[13px] text-fg inline-flex items-center gap-2 hover:bg-elevated">
                    <Volume2 className="w-4 h-4" aria-hidden /> Play voice
                  </button>
                </div>
                <p className="text-[13px] text-muted min-h-[20px]">{testing ? testHeard || "Say a sentence. It should appear here." : testHeard ? `Heard: ${testHeard}` : "Say a sentence and check that it appears."}</p>
              </div>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={startRound}
              className="self-start h-12 px-6 rounded-xl bg-accent text-bg text-[15px] font-semibold hover:opacity-90 disabled:opacity-50"
            >
              Start the first question
            </button>
          </div>
        )}

        {phase === "loading" && (
          <div className="flex-1 flex items-center justify-center text-muted text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Getting the question ready
          </div>
        )}

        {phase === "question" && view?.question && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[14px] font-semibold text-fg">
                Question {view.position + 1} of {view.total}
              </span>
              <ol aria-label="Progress" className="flex items-center gap-1.5">
                {Array.from({ length: view.total }, (_, i) => {
                  const st = view.statuses[i];
                  const cur = i === view.position;
                  return (
                    <li
                      key={i}
                      aria-label={`Question ${i + 1}: ${cur ? "current" : st ?? "not started"}`}
                      className={`h-2.5 rounded-full ${cur ? "w-5 bg-accent" : st === "answered" ? "w-2.5 bg-secondary" : st === "skipped" ? "w-2.5 border-[1.5px] border-subtle" : "w-2.5 bg-elevated"}`}
                    />
                  );
                })}
              </ol>
              <span
                className={`ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[13px] tabular-nums ${low ? "border-warning/50 bg-warning/10 text-warning" : "border-border bg-surface text-fg"}`}
                aria-label="Time left for this question"
              >
                <Clock className="w-3.5 h-3.5" aria-hidden />
                {remaining != null ? fmt(remaining) : fmt(view.followUp ? view.followUpSeconds : view.secondsPerQuestion)}
              </span>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 lg:p-7 flex flex-col gap-3">
              {(view.question.tech || view.question.difficulty) && (
                <div className="flex gap-2">
                  {view.question.tech && <span className="px-2 py-0.5 rounded-md bg-panel text-xs text-muted capitalize">{view.question.tech.replace(/-/g, " ")}</span>}
                  {view.question.difficulty && <span className="px-2 py-0.5 rounded-md bg-panel text-xs text-muted capitalize">{view.question.difficulty}</span>}
                </div>
              )}
              <h2 className={`font-semibold leading-snug text-fg ${view.followUp ? "text-[16px] text-muted" : "text-[20px] lg:text-[25px]"}`}>{view.question.text}</h2>
              {view.followUp && (
                <div className="rounded-xl border border-secondary/40 bg-secondary/[0.08] px-4 py-3 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-secondary-soft">Follow-up</span>
                  <p className="text-[17px] lg:text-[19px] font-medium leading-snug text-fg">{view.followUp}</p>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-[160px] rounded-2xl border border-border bg-surface/60 p-4 lg:p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-subtle">
                <label htmlFor={`theory-answer-${roundId}`} className="font-medium">
                  Your answer
                </label>
                <span className="ml-auto">{listening ? "Pause the mic to fix a word" : canType ? "You can edit before moving on" : ""}</span>
              </div>
              <textarea
                id={`theory-answer-${roundId}`}
                value={text}
                readOnly={listening || !canType || !answering}
                onChange={(e) => {
                  if (!typedRef.current) {
                    typedRef.current = true;
                    if (firstWordRef.current == null) firstWordRef.current = Math.round((Date.now() - startedAtRef.current) / 1000);
                  }
                  setText(e.target.value);
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  toast("Pasting is turned off for answers.");
                }}
                placeholder={ai === "speaking" ? "Listen to the question first." : listening ? "Start speaking. Your words appear here." : canType ? "Type your answer, or turn on the mic." : "Turn on the mic to answer."}
                className="flex-1 min-h-[120px] w-full resize-none bg-transparent text-[15.5px] leading-relaxed text-fg placeholder:text-subtle outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canSpeak && (
                <button
                  type="button"
                  disabled={!answering}
                  onClick={() => (listening ? (stopMic(), setAi("idle")) : (setTyping(false), startMic()))}
                  aria-label={listening ? "Pause the microphone" : "Turn on the microphone"}
                  aria-pressed={listening}
                  className={`w-12 h-12 rounded-xl inline-flex items-center justify-center disabled:opacity-40 ${listening ? "bg-accent text-bg" : "border border-border-strong bg-surface text-fg hover:bg-elevated"}`}
                >
                  {listening ? <Mic className="w-5 h-5" aria-hidden /> : <MicOff className="w-5 h-5" aria-hidden />}
                </button>
              )}
              {canSpeak && canType && (
                <button type="button" disabled={!answering} onClick={typeInstead} className="h-12 px-4 rounded-xl border border-border-strong text-[14px] text-fg inline-flex items-center gap-2 hover:bg-elevated disabled:opacity-40">
                  <Keyboard className="w-4 h-4" aria-hidden /> Type instead
                </button>
              )}
              <button type="button" disabled={!answering} onClick={() => void submit(true)} className="h-12 px-4 rounded-xl border border-border-strong text-[14px] text-fg inline-flex items-center gap-2 hover:bg-elevated disabled:opacity-40">
                <SkipForward className="w-4 h-4" aria-hidden /> Skip
              </button>
              <button
                type="button"
                disabled={!answering || !text.trim()}
                onClick={() => void submit(false)}
                className="ml-auto h-12 px-5 rounded-xl bg-accent text-bg text-[15px] font-semibold hover:opacity-90 disabled:opacity-40"
              >
                {ai === "thinking" ? "Saving" : view.position + 1 >= view.total && !view.followUp ? "Done, last question" : "Done, next question"}
              </button>
            </div>
          </>
        )}

        {phase === "done" && view && (
          <div className="max-w-xl flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-fg">Round complete</h2>
            <p className="text-[14px] text-muted">
              You answered {view.statuses.filter((s) => s === "answered").length} of {view.total} questions. Your answers are saved.
            </p>
            <button
              type="button"
              disabled={finishing}
              onClick={onFinish}
              className="self-start h-12 px-6 rounded-xl bg-accent text-bg text-[15px] font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {finishing ? "Submitting" : finishLabel}
            </button>
          </div>
        )}
      </section>
    </div>
  );

  function beginAnswerAfterRepeat() {
    // A repeat does not reset the timer; it only resumes listening.
    if (view && view.answerMode !== "typing" && recRef.current && !typing) startMic();
    else setAi("idle");
  }
}

function StateDot({ ai }: { ai: AiState }) {
  const tone = ai === "listening" ? "bg-accent" : ai === "speaking" ? "bg-secondary" : "bg-subtle";
  return <span className={`w-2 h-2 rounded-full ${tone}`} aria-hidden />;
}

function Orb({ ai }: { ai: AiState }) {
  return (
    <div className={`theory-orb ${ai} relative shrink-0 w-12 h-12 lg:w-[240px] lg:h-[240px] lg:mt-6`} aria-hidden>
      <span className="ring" />
      <span className="ring r2" />
      <span className="ring r3" />
      <svg className="arc absolute inset-0 w-full h-full" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="40 280" strokeLinecap="round" />
      </svg>
      <span className="core" />
    </div>
  );
}

const ORB_CSS = `
.theory-orb{color:rgb(var(--c-accent-2))}
.theory-orb .core{position:absolute;inset:13%;border-radius:9999px;background:radial-gradient(circle at 35% 30%,rgb(var(--c-accent-2-soft)) 0%,rgb(var(--c-accent-2)) 55%,rgba(20,18,60,.9) 100%);box-shadow:0 0 60px rgba(var(--c-accent-2),.35);animation:theory-breathe 3.2s ease-in-out infinite}
.theory-orb .ring{position:absolute;inset:0;border-radius:9999px;border:2px solid rgb(var(--c-accent-2));opacity:0}
.theory-orb.speaking .ring{animation:theory-ring 1.8s ease-out infinite}
.theory-orb.speaking .ring.r2{animation-delay:.6s}
.theory-orb.speaking .ring.r3{animation-delay:1.2s}
.theory-orb.listening .ring{border-color:var(--accent);animation:theory-ring 2.6s ease-out infinite}
.theory-orb.listening .ring.r2{animation-delay:1.3s}
.theory-orb .arc{opacity:0}
.theory-orb.thinking .arc{opacity:1;animation:theory-spin 1.4s linear infinite}
@keyframes theory-ring{0%{transform:scale(1);opacity:.55}100%{transform:scale(1.5);opacity:0}}
@keyframes theory-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes theory-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){.theory-orb .ring,.theory-orb .core,.theory-orb .arc{animation:none!important}}
`;

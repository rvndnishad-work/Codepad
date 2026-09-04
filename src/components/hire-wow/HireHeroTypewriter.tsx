"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hero headline second line: types through the argument one hook at a time.
 * Negatives (what the pile costs you) render in bare white with a rose caret;
 * positives (what the workspace does about it) switch to the boss gradient.
 *
 * SSR renders the first hook in full so there is no layout shift or blank
 * frame — the effect picks up from that state on mount. Honours
 * prefers-reduced-motion by cross-fading instead of typing, and idles while
 * the hero is off-screen or the tab is hidden.
 */

export type Hook = { text: string; tone: "bad" | "good" };

/**
 * Kept short on purpose: the line is `whitespace-nowrap` inside an
 * `overflow-hidden` mask, so anything wider than the 375px viewport gets
 * silently clipped rather than wrapping. Longest hook measures ~277px at the
 * 9vw mobile step, against ~297px of available width.
 */
const HOOKS: Hook[] = [
  { text: "YOU READ 40.", tone: "bad" },
  { text: "#612 SKIPPED.", tone: "bad" },
  { text: "THE QUEUE WON.", tone: "bad" },
  { text: "1,000 SCORED.", tone: "good" },
  { text: "#612 IS NOW #1.", tone: "good" },
  { text: "RANKED BY 9AM.", tone: "good" },
];

const TYPE_MS = 55;
const DELETE_MS = 28;
const HOLD_MS = 1700;

export default function HireHeroTypewriter() {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(HOOKS[0].text);
  const [deleting, setDeleting] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [awake, setAwake] = useState(true);
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onMq = () => setReduced(mq.matches);
    mq.addEventListener("change", onMq);

    const el = wrap.current;
    const obs = el
      ? new IntersectionObserver(([e]) => setAwake(e.isIntersecting), { threshold: 0.05 })
      : null;
    if (el && obs) obs.observe(el);

    const onVis = () => setAwake(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mq.removeEventListener("change", onMq);
      obs?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Reduced motion: swap whole hooks on a slow timer, no character animation.
  useEffect(() => {
    if (!reduced || !awake) return;
    const t = setTimeout(() => {
      const next = (i + 1) % HOOKS.length;
      setI(next);
      setShown(HOOKS[next].text);
    }, 3600);
    return () => clearTimeout(t);
  }, [reduced, awake, i]);

  useEffect(() => {
    if (reduced || !awake) return;
    const full = HOOKS[i].text;

    if (!deleting && shown === full) {
      const t = setTimeout(() => setDeleting(true), HOLD_MS);
      return () => clearTimeout(t);
    }
    if (deleting && shown === "") {
      setDeleting(false);
      setI((n) => (n + 1) % HOOKS.length);
      return;
    }
    const t = setTimeout(
      () =>
        setShown((s) => (deleting ? full.slice(0, s.length - 1) : full.slice(0, s.length + 1))),
      deleting ? DELETE_MS : TYPE_MS,
    );
    return () => clearTimeout(t);
  }, [shown, deleting, i, reduced, awake]);

  const good = HOOKS[i].tone === "good";

  return (
    <span ref={wrap} className="inline-flex items-baseline">
      <span
        aria-hidden
        className={
          good
            ? "wow-gradient-boss transition-colors duration-500"
            : "text-white transition-colors duration-500"
        }
      >
        {shown || " "}
      </span>
      <span
        aria-hidden
        className={`wow-blink ml-[0.06em] inline-block h-[0.72em] w-[0.07em] translate-y-[0.02em] ${
          good ? "bg-[#8b93ff]" : "bg-rose-400"
        }`}
      />
      <span className="sr-only">
        You read 40 of them and skipped number 612. Send every applicant a
        take-home or an AI interview instead: all 1,000 scored, ranked by 9am.
      </span>
    </span>
  );
}

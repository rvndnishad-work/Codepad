"use client";

/**
 * Natural-sounding TTS for the Gemma/Jarvis Copilot.
 *
 * Two-tier playback:
 *
 *   Tier 1 — Browser (default, no API key needed)
 *     • Smart voice picker scores all `speechSynthesis.getVoices()` by
 *       quality heuristics: "Natural"/"Neural"/"Online" tokens win, local
 *       OS voices lose, English-only.
 *     • Sentence chunking: instead of one monolithic utterance, we split
 *       on terminal punctuation and queue each clause separately. The
 *       speech engine inserts a tiny natural pause between utterances —
 *       this single change is what makes browser TTS stop sounding like
 *       a 90s GPS unit.
 *     • Tuned rate (0.97) and pitch (0.95) for warmer, conversational cadence.
 *
 *   Tier 2 — Cloud (opt-in via env vars on the server)
 *     • Calls POST /api/admin/tts which proxies to OpenAI or ElevenLabs.
 *     • If neither key is set, the route returns 503 and we permanently
 *       skip the cloud path for the rest of this page load.
 *     • If a key is set, the returned audio/mpeg plays via <Audio>.
 *
 * Both paths share the same `cleanForSpeech` preprocessor so markdown,
 * URLs, emoji, and code blocks never end up being read aloud.
 */

let activeAudio: HTMLAudioElement | null = null;
let activeUtterances: SpeechSynthesisUtterance[] = [];
// Per-page cache: once we've learned the cloud route is unavailable, don't
// keep hitting it on every utterance.
let cloudAvailable: boolean | null = null;

/**
 * Quality-token scoring: voices whose `name` contains any of these are
 * dramatically better than the OS defaults. "Natural" is Microsoft's
 * neural marker on Edge/Chrome on Windows. "Neural2"/"Wavenet"/"Studio"
 * are Google Cloud TTS markers. "Online" indicates a cloud-backed voice.
 */
const QUALITY_TOKENS = [
  "natural", "neural", "wavenet", "studio", "online", "premium", "polyglot",
] as const;

/**
 * Ordered preference list — voices found here jump to the top of the
 * ranking. Listed roughly best-to-worst by my (subjective) ear test:
 * Microsoft Online Natural voices on Edge ≫ Google's English neural ≫
 * macOS Samantha ≫ everything else.
 */
const PREFERRED_NAMES = [
  "Microsoft Aria Online",
  "Microsoft Jenny Online",
  "Microsoft Davis Online",
  "Microsoft Guy Online",
  "Microsoft Sara Online",
  "Google UK English Female",
  "Google US English",
  "Samantha",
  "Allison",
  "Karen",
  "Daniel",
  "Microsoft Zira",
  "Microsoft David",
];

function scoreVoice(voice: SpeechSynthesisVoice): number {
  let s = 0;
  const name = voice.name.toLowerCase();

  // English required — everything else is disqualified.
  if (!voice.lang.toLowerCase().startsWith("en")) return -Infinity;

  // Local OS voices tend to be the old robotic ones. Penalize them so a
  // remote/cloud-backed alternative wins even if no quality token matches.
  if (voice.localService) s -= 8;

  for (const token of QUALITY_TOKENS) {
    if (name.includes(token)) s += 35;
  }

  // Preferred name boost — earlier in the list = bigger bonus.
  PREFERRED_NAMES.forEach((preferred, i) => {
    if (name.includes(preferred.toLowerCase())) {
      s += (PREFERRED_NAMES.length - i) * 4;
    }
  });

  // Slight bonus for default voice as a tie-breaker
  if (voice.default) s += 1;

  return s;
}

export function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const ranked = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return ranked[0] ?? null;
}

/**
 * Split text into utterance-sized chunks. The speech engine inserts a
 * micro-pause between utterances which mimics natural breathing — this
 * single trick makes browser TTS sound dramatically less robotic. Cap
 * each chunk to ~200 chars so the engine doesn't choke on very long
 * single sentences.
 */
function chunkSentences(text: string): string[] {
  const chunks: string[] = [];
  // Split on terminal punctuation; keep the punctuation with the clause.
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  for (const sentence of sentences) {
    if (sentence.length <= 200) {
      chunks.push(sentence);
    } else {
      // Long sentence — split at commas/semicolons.
      const sub = sentence.split(/[,;]\s+/).map((s) => s.trim()).filter(Boolean);
      chunks.push(...sub);
    }
  }
  return chunks;
}

/**
 * Strip everything that shouldn't be read aloud: markdown, code blocks,
 * URLs, table syntax, emoji clusters, decorative bullets. Leaves a clean
 * stream of prose for the TTS engine.
 */
export function cleanForSpeech(raw: string): string {
  let s = raw;
  s = s.replace(/```[\s\S]*?```/g, "");           // fenced code
  s = s.replace(/`([^`]+)`/g, "$1");                // inline code
  s = s.replace(/^\s*\|.*\|\s*$/gm, "");            // markdown tables
  s = s.replace(/!\[[^\]]*\]\([^)]+\)/g, "");       // images
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");    // links → label only
  s = s.replace(/https?:\/\/\S+/g, "");             // bare URLs
  s = s.replace(/[#*_~>]/g, "");                     // markdown markers
  // Emoji & decorative pictographs (U+1F300..U+1FAFF range plus common dingbats).
  s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{25A0}-\u{25FF}]/gu, "");
  s = s.replace(/[•▶◀✓✗⚡🟢🟡🔴🚨📋📝]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

interface SpeakCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: unknown) => void;
}

/**
 * Try the server-side cloud TTS first. Returns an <Audio> element ready
 * to play, or null if the cloud is unavailable (no key configured, network
 * error, or rate-limit response).
 */
async function tryCloudTTS(text: string): Promise<HTMLAudioElement | null> {
  if (cloudAvailable === false) return null;
  try {
    const res = await fetch("/api/admin/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.status === 503) {
      // Permanent fall-through — no provider configured. Don't try again.
      cloudAvailable = false;
      return null;
    }
    if (!res.ok) {
      // Transient — don't poison cloudAvailable, just fall back this once.
      return null;
    }
    cloudAvailable = true;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    // Auto-cleanup the object URL once playback finishes.
    audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
    return audio;
  } catch {
    return null;
  }
}

export async function speakNaturally(text: string, callbacks: SpeakCallbacks = {}): Promise<void> {
  cancelSpeak();

  const clean = cleanForSpeech(text);
  if (!clean) {
    callbacks.onEnd?.();
    return;
  }

  // Tier 2 first: cloud
  const audio = await tryCloudTTS(clean);
  if (audio) {
    activeAudio = audio;
    audio.addEventListener("play",  () => callbacks.onStart?.(), { once: true });
    audio.addEventListener("ended", () => {
      activeAudio = null;
      callbacks.onEnd?.();
    }, { once: true });
    audio.addEventListener("error", (e) => {
      activeAudio = null;
      callbacks.onError?.(e);
    }, { once: true });
    try {
      await audio.play();
    } catch (err) {
      activeAudio = null;
      callbacks.onError?.(err);
    }
    return;
  }

  // Tier 1: browser
  if (typeof window === "undefined" || !window.speechSynthesis) {
    callbacks.onError?.(new Error("speechSynthesis not available"));
    return;
  }

  const voices = window.speechSynthesis.getVoices();
  const voice = pickBestVoice(voices);
  const chunks = chunkSentences(clean);
  if (chunks.length === 0) {
    callbacks.onEnd?.();
    return;
  }

  let startedOnce = false;
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    if (voice) u.voice = voice;
    // Tuned for warmth + clarity:
    //   rate < 1   = a hair slower than default for conversational pacing
    //   pitch < 1  = slightly lower than default for a less "perky" tone
    //   volume     = a touch under max to avoid clipping on bright voices
    u.rate = 0.97;
    u.pitch = 0.95;
    u.volume = 0.92;

    if (i === 0) {
      u.onstart = () => {
        if (!startedOnce) {
          startedOnce = true;
          callbacks.onStart?.();
        }
      };
    }
    if (i === chunks.length - 1) {
      u.onend = () => {
        activeUtterances = [];
        callbacks.onEnd?.();
      };
    }
    u.onerror = (e) => {
      activeUtterances = [];
      callbacks.onError?.(e);
    };

    activeUtterances.push(u);
    window.speechSynthesis.speak(u);
  });
}

export function cancelSpeak(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch { /* ignore */ }
    activeAudio = null;
  }
  activeUtterances = [];
}

/** True while either the cloud audio is playing or the browser is mid-utterance. */
export function isSpeechActive(): boolean {
  if (activeAudio && !activeAudio.paused) return true;
  if (typeof window !== "undefined" && window.speechSynthesis?.speaking) return true;
  return false;
}

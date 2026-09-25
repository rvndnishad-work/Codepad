"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Microphone recording for theory answers: one clip per stretch of mic-on
 * time, plus a live input level (0 to 1) for the interviewer orb and the mic
 * check. The stream is opened on first use and kept for the round.
 */

const MIME_CHOICES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];

export function canRecord(): boolean {
  return typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

function pickMime(): string | undefined {
  return MIME_CHOICES.find((m) => MediaRecorder.isTypeSupported?.(m));
}

export type Clip = { blob: Blob; seconds: number };

export function useAnswerRecorder() {
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const levelRef = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);

  /** Opens the microphone once and starts measuring its level. Throws when access is refused. */
  const open = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    streamRef.current = stream;
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        ctxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) sum += ((v - 128) / 128) ** 2;
          const rms = Math.sqrt(sum / buf.length);
          // Speech sits around 0.02 to 0.2 RMS; map that onto 0 to 1 and smooth it.
          const target = Math.min(1, Math.max(0, (rms - 0.01) * 6));
          levelRef.current += (target - levelRef.current) * 0.3;
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      }
    } catch {
      /* the level is decoration; recording still works without it */
    }
    return stream;
  }, []);

  const startClip = useCallback(async () => {
    const stream = await open();
    if (recRef.current?.state === "recording") return;
    const mimeType = pickMime();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 48_000 } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.start(1000);
    recRef.current = rec;
    startedRef.current = Date.now();
  }, [open]);

  /** Stops the current clip. Resolves null when nothing was recording. */
  const stopClip = useCallback((): Promise<Clip | null> => {
    const rec = recRef.current;
    recRef.current = null;
    if (!rec || rec.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        chunksRef.current = [];
        resolve(blob.size ? { blob, seconds: Math.round((Date.now() - startedRef.current) / 1000) } : null);
      };
      rec.stop();
    });
  }, []);

  const recording = useCallback(() => recRef.current?.state === "recording", []);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      try {
        recRef.current?.stop();
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void ctxRef.current?.close().catch(() => {});
    },
    [],
  );

  return { open, startClip, stopClip, recording, levelRef };
}

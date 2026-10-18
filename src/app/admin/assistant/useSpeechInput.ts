"use client";

/**
 * Browser voice input for the assistant (Web Speech API). Nothing is sent to
 * a server for transcription: the browser hands back the text and we put it
 * in the input. Unsupported browsers simply get no mic button.
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start: () => void;
  stop: () => void;
};

export function useSpeechInput(onText: (text: string) => void) {
  const recRef = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onTextRef.current = onText;
  });

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = navigator.language || "en-US";
    rec.onstart = () => {
      setError(null);
      setListening(true);
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      setError(e?.error === "not-allowed" ? "Microphone access is blocked." : "Voice input did not catch that.");
    };
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript?.trim();
      if (text) onTextRef.current(text);
    };
    recRef.current = rec;
    setSupported(true);
    return () => {
      try {
        rec.stop();
      } catch {
        /* not running */
      }
      recRef.current = null;
    };
  }, []);

  const toggle = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      if (listening) rec.stop();
      else rec.start();
    } catch {
      /* start() throws while already running */
    }
  }, [listening]);

  return { supported, listening, error, toggle };
}

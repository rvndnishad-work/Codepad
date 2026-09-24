"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

const LANGUAGE_NAMES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  jsx: "JSX",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TSX",
  py: "Python",
  python: "Python",
  sql: "SQL",
  bash: "Shell",
  sh: "Shell",
  shell: "Shell",
  json: "JSON",
  html: "HTML",
  css: "CSS",
  go: "Go",
  java: "Java",
  text: "Output",
  txt: "Output",
  plaintext: "Output",
};

/** A fenced code block in a long-form doc: language label, copy button, horizontal scroll. */
export default function DocCodeBlock({ language, text, children }: { language: string; text: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const name = LANGUAGE_NAMES[language.toLowerCase()] ?? (language ? language.toUpperCase() : "Code");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text.replace(/\n$/, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  }

  return (
    <div className="doc-code not-prose">
      <div className="doc-code-bar">
        <span>{name}</span>
        <button type="button" onClick={copy} aria-label={copied ? "Copied" : "Copy code"}>
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

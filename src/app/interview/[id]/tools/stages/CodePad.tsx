"use client";

/** Code pad: a shared CodeMirror scratch editor with a language picker. Nothing runs. */
import { useEffect, useMemo, useState } from "react";
import { CODE_LANGS, type CodeLang } from "@/lib/interview/tools";
import SharedEditor from "../SharedEditor";
import type { ToolProps } from "../types";
import type { ToolsRoom } from "../useToolsRoom";

function useCodeLang(room: ToolsRoom): [CodeLang, (l: CodeLang) => void] {
  const meta = useMemo(() => room.doc.getMap<string>("meta"), [room.doc]);
  const read = () => {
    const v = meta.get("codeLang");
    return (CODE_LANGS as readonly string[]).includes(v ?? "") ? (v as CodeLang) : "javascript";
  };
  const [lang, setLang] = useState<CodeLang>(read);
  useEffect(() => {
    const on = () => setLang(read());
    meta.observe(on);
    return () => meta.unobserve(on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta]);
  return [lang, (l) => meta.set("codeLang", l)];
}

const LANG_LABEL: Record<CodeLang, string> = { javascript: "JavaScript", typescript: "TypeScript", python: "Python", sql: "SQL", html: "HTML", css: "CSS", text: "Plain text" };

export function CodeLangPicker({ room, readOnly: disabled }: ToolProps) {
  const [lang, setLang] = useCodeLang(room);
  return (
    <select
      value={lang}
      disabled={disabled}
      onChange={(e) => setLang(e.target.value as CodeLang)}
      aria-label="Language"
      className="h-8 rounded-lg border border-border bg-bg px-2 text-[12px] text-fg focus:outline-none focus:border-secondary/60"
    >
      {CODE_LANGS.map((l) => (
        <option key={l} value={l}>
          {LANG_LABEL[l]}
        </option>
      ))}
    </select>
  );
}

export default function CodePad({ room, dark, readOnly }: ToolProps) {
  const [lang] = useCodeLang(room);
  return (
    <SharedEditor
      key={`code-${lang}-${dark}`}
      text={room.doc.getText("code")}
      awareness={room.awareness}
      language={lang}
      dark={dark}
      readOnly={readOnly}
      label="Shared code pad"
      placeholder="A shared scratch editor. Nothing runs here; use it for a snippet, a query or pseudo code."
    />
  );
}


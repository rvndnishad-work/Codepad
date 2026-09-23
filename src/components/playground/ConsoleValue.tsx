"use client";

import { Fragment, type ReactNode } from "react";
import {
  consoleKeyText,
  decodeConsoleValue,
  sizeOf,
  type ConsoleNode,
} from "@/lib/console-value";

/** Devtools-style colours per value type. */
export const CONSOLE_COLORS = {
  number: "text-sky-400",
  boolean: "text-purple-400",
  nullish: "text-muted/60",
  string: "text-emerald-400",
  key: "text-sky-300",
  special: "text-amber-300",
} as const;

const PREVIEW_DEPTH = 3;

function join(parts: ReactNode[]): ReactNode[] {
  return parts.map((p, i) => (
    <Fragment key={i}>
      {i > 0 ? ", " : ""}
      {p}
    </Fragment>
  ));
}

/** One-line coloured preview of a decoded value (same text as formatConsoleValue). */
export function InlineValue({ node, level = 0 }: { node: ConsoleNode; level?: number }): ReactNode {
  switch (node.t) {
    case "str":
      return level === 0 ? node.v : <span className={CONSOLE_COLORS.string}>{JSON.stringify(node.v)}</span>;
    case "num":
      return <span className={CONSOLE_COLORS.number}>{node.v}</span>;
    case "bool":
      return <span className={CONSOLE_COLORS.boolean}>{String(node.v)}</span>;
    case "null":
      return <span className={CONSOLE_COLORS.nullish}>null</span>;
    case "undef":
      return <span className={CONSOLE_COLORS.nullish}>undefined</span>;
    case "fn":
      return <span className={CONSOLE_COLORS.special}>{node.name ? `ƒ ${node.name}()` : "ƒ ()"}</span>;
    case "date":
    case "regexp":
      return <span className={CONSOLE_COLORS.special}>{node.v}</span>;
    case "error":
      return node.stack && level === 0 ? node.stack : `${node.name}: ${node.message}`;
    case "circular":
      return <span className={CONSOLE_COLORS.nullish}>[Circular]</span>;
    case "element":
      return <span className={CONSOLE_COLORS.key}>{`<${node.v}>`}</span>;
    case "array": {
      const prefix = node.label ? `${node.label}(${sizeOf(node)}) ` : "";
      if (level >= PREVIEW_DEPTH && sizeOf(node) > 0) return `${prefix}[…]`;
      const parts = node.items.map((x, i) => <InlineValue key={i} node={x} level={level + 1} />);
      if (node.more) parts.push(<span className={CONSOLE_COLORS.nullish}>…{node.more} more</span>);
      return (
        <>
          {prefix}[{join(parts)}]
        </>
      );
    }
    case "set": {
      if (level >= PREVIEW_DEPTH && node.items.length > 0) return `Set(${node.items.length}) {…}`;
      return (
        <>
          Set({node.items.length}) {"{"}
          {join(node.items.map((x, i) => <InlineValue key={i} node={x} level={level + 1} />))}
          {"}"}
        </>
      );
    }
    case "map": {
      if (level >= PREVIEW_DEPTH && node.entries.length > 0) return `Map(${node.entries.length}) {…}`;
      return (
        <>
          Map({node.entries.length}) {"{"}
          {join(
            node.entries.map(([k, v], i) => (
              <Fragment key={i}>
                <InlineValue node={k} level={level + 1} /> {"=>"} <InlineValue node={v} level={level + 1} />
              </Fragment>
            )),
          )}
          {"}"}
        </>
      );
    }
    case "object": {
      if (level >= PREVIEW_DEPTH && sizeOf(node) > 0) return "{…}";
      const parts = node.entries.map(([k, v], i) => (
        <Fragment key={i}>
          <span className={CONSOLE_COLORS.key}>{consoleKeyText(k)}</span>: <InlineValue node={v} level={level + 1} />
        </Fragment>
      ));
      if (node.more) parts.push(<span className={CONSOLE_COLORS.nullish}>…{node.more} more</span>);
      return <>{"{"}{join(parts)}{"}"}</>;
    }
  }
}

/** One raw console argument, decoded from Sandpack's wire format. */
export function ConsoleArg({ value }: { value: unknown }) {
  return <InlineValue node={decodeConsoleValue(value)} />;
}

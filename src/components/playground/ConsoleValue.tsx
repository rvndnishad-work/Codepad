"use client";

import { Fragment, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import {
  consoleKeyText,
  decodeConsoleValue,
  isContainer,
  sizeOf,
  type ConsoleNode,
} from "@/lib/console-value";

/** Devtools-style colours per value type (the dark theme's syntax hues). */
export const CONSOLE_COLORS = {
  number: "text-secondary-soft",
  boolean: "text-secondary-soft",
  nullish: "text-subtle",
  string: "text-success",
  key: "text-muted",
  special: "text-warning",
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

function childRows(node: ConsoleNode): { key: ReactNode; value: ConsoleNode }[] {
  switch (node.t) {
    case "array":
      return node.items.map((v, i) => ({ key: String(i), value: v }));
    case "set":
      return node.items.map((v, i) => ({ key: String(i), value: v }));
    case "map":
      return node.entries.map(([k, v]) => ({
        key: <InlineValue node={k} level={1} />,
        value: v,
      }));
    case "object":
      return node.entries.map(([k, v]) => ({ key: consoleKeyText(k), value: v }));
    default:
      return [];
  }
}

/**
 * Expandable devtools-style value. Containers show their one-line preview
 * behind a disclosure button; expanding lists each entry, and nested
 * containers expand on their own.
 */
export function ConsoleTree({ node, label }: { node: ConsoleNode; label?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const expandable = isContainer(node) && sizeOf(node) > 0;
  if (!expandable) {
    return (
      <span>
        {label}
        <InlineValue node={node} level={label ? 1 : 0} />
      </span>
    );
  }
  const rows = childRows(node);
  const more = (node.t === "array" || node.t === "object") && node.more ? node.more : 0;
  return (
    <span className="inline-block max-w-full align-top">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex max-w-full items-start gap-1 rounded-sm text-left hover:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <ChevronRight
          className={`mt-[3px] h-3 w-3 shrink-0 text-subtle transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden
        />
        <span className="min-w-0">
          {label}
          <InlineValue node={node} level={1} />
        </span>
      </button>
      {open && (
        <span className="ml-[7px] block border-l border-border pl-3">
          {rows.map((r, i) => (
            <span key={i} className="block">
              <ConsoleTree
                node={r.value}
                label={
                  <>
                    <span className={CONSOLE_COLORS.key}>{r.key}</span>
                    {node.t === "map" ? " => " : ": "}
                  </>
                }
              />
            </span>
          ))}
          {more > 0 && <span className={`block ${CONSOLE_COLORS.nullish}`}>…{more} more</span>}
        </span>
      )}
    </span>
  );
}

/** One raw console argument as an expandable tree. */
export function ConsoleArgTree({ value }: { value: unknown }) {
  return <ConsoleTree node={decodeConsoleValue(value)} />;
}

/**
 * Decoder for Sandpack console payloads.
 *
 * `useSandpackConsole` hands back logs exactly as the bundler iframe posted
 * them: console-feed's wire encoding, where anything JSON can't carry is
 * wrapped as `{"#@t": "[[Map]]", data: [...]}` (or `"@t"` in older builds)
 * and repeated objects become `{"#@r": n}` pointers. Sandpack's own console
 * decodes this; our custom console must too, or `console.log(undefined)`
 * prints `{"#@t":"[[undefined]]","data":""}`.
 *
 * The bundler only posts the first element of the encoded tuple, so the
 * reference table a `#@r` pointer indexes into never arrives — pointers are
 * rendered as `[Circular]`.
 *
 * `decodeConsoleValue` turns one raw argument into a small typed tree that
 * both the inline preview (`formatConsoleValue`) and the expandable
 * inspector render from.
 */

export type ConsoleNode =
  | { t: "str"; v: string }
  | { t: "num"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "null" }
  | { t: "undef" }
  | { t: "fn"; name: string }
  | { t: "date"; v: string }
  | { t: "regexp"; v: string }
  | { t: "error"; name: string; message: string; stack?: string }
  | { t: "circular" }
  | { t: "element"; v: string }
  | { t: "array"; items: ConsoleNode[]; label?: string; more?: number }
  | { t: "set"; items: ConsoleNode[] }
  | { t: "map"; entries: [ConsoleNode, ConsoleNode][] }
  | { t: "object"; entries: [string, ConsoleNode][]; more?: number };

const TYPE_KEYS = ["#@t", "@t"] as const;
const REF_KEYS = ["#@r", "@r"] as const;
/** Deeper than this is rendered as `[Object]` / `[Array]` — keeps a hostile
 *  payload from recursing without bound. */
const MAX_DEPTH = 12;
/** Entries kept per container; the rest collapse into a `…N more` marker. */
const MAX_ENTRIES = 200;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function typeTag(v: Record<string, unknown>): string | null {
  for (const k of TYPE_KEYS) {
    if (typeof v[k] === "string") return v[k] as string;
  }
  return null;
}

function isRef(v: Record<string, unknown>): boolean {
  return REF_KEYS.some((k) => k in v) && Object.keys(v).length === 1;
}

function numberText(n: number): string {
  if (Object.is(n, -0)) return "-0";
  return String(n);
}

export function decodeConsoleValue(raw: unknown, depth = 0): ConsoleNode {
  if (raw === null) return { t: "null" };
  if (raw === undefined) return { t: "undef" };
  if (typeof raw === "string") return { t: "str", v: raw };
  if (typeof raw === "number") return { t: "num", v: numberText(raw) };
  if (typeof raw === "boolean") return { t: "bool", v: raw };
  if (typeof raw === "bigint") return { t: "num", v: `${raw}n` };
  if (typeof raw !== "object") return { t: "str", v: String(raw) };

  if (depth >= MAX_DEPTH) {
    return Array.isArray(raw)
      ? { t: "array", items: [], more: raw.length }
      : { t: "object", entries: [], more: Object.keys(raw).length };
  }

  if (Array.isArray(raw)) {
    const items = raw.slice(0, MAX_ENTRIES).map((x) => decodeConsoleValue(x, depth + 1));
    const more = raw.length > MAX_ENTRIES ? raw.length - MAX_ENTRIES : undefined;
    return more ? { t: "array", items, more } : { t: "array", items };
  }

  const rec = raw as Record<string, unknown>;
  if (isRef(rec)) return { t: "circular" };

  const tag = typeTag(rec);
  if (tag) return decodeTagged(tag, rec.data, depth);

  const keys = Object.keys(rec);
  const entries: [string, ConsoleNode][] = keys
    .slice(0, MAX_ENTRIES)
    .map((k) => [k, decodeConsoleValue(rec[k], depth + 1)]);
  const more = keys.length > MAX_ENTRIES ? keys.length - MAX_ENTRIES : undefined;
  return more ? { t: "object", entries, more } : { t: "object", entries };
}

function decodeTagged(tag: string, data: unknown, depth: number): ConsoleNode {
  switch (tag) {
    case "[[undefined]]":
      return { t: "undef" };
    case "[[NaN]]":
      return { t: "num", v: "NaN" };
    case "Arithmetic":
      if (data === 0) return { t: "num", v: "Infinity" };
      if (data === 1) return { t: "num", v: "-Infinity" };
      if (data === 2) return { t: "num", v: "-0" };
      return { t: "num", v: String(data) };
    case "[[Date]]": {
      const d = new Date(typeof data === "number" ? data : NaN);
      return { t: "date", v: Number.isNaN(d.getTime()) ? "Invalid Date" : d.toISOString() };
    }
    case "[[RegExp]]": {
      const r = isRecord(data) ? data : {};
      return { t: "regexp", v: `/${String(r.src ?? "")}/${String(r.flags ?? "")}` };
    }
    case "[[Error]]": {
      const e = isRecord(data) ? data : {};
      return {
        t: "error",
        name: String(e.name ?? "Error"),
        message: String(e.message ?? ""),
        ...(typeof e.stack === "string" ? { stack: e.stack } : {}),
      };
    }
    case "Function": {
      const f = isRecord(data) ? data : {};
      return { t: "fn", name: typeof f.name === "string" ? f.name : "" };
    }
    case "HTMLElement": {
      const el = isRecord(data) ? data : {};
      return { t: "element", v: String(el.tagName ?? "element").toLowerCase() };
    }
    case "[[Map]]": {
      const flat = Array.isArray(data) ? data : [];
      const entries: [ConsoleNode, ConsoleNode][] = [];
      for (let i = 0; i + 1 < flat.length && entries.length < MAX_ENTRIES; i += 2) {
        entries.push([decodeConsoleValue(flat[i], depth + 1), decodeConsoleValue(flat[i + 1], depth + 1)]);
      }
      return { t: "map", entries };
    }
    case "[[Set]]": {
      const items = (Array.isArray(data) ? data : [])
        .slice(0, MAX_ENTRIES)
        .map((x) => decodeConsoleValue(x, depth + 1));
      return { t: "set", items };
    }
    case "[[TypedArray]]": {
      const ta = isRecord(data) ? data : {};
      const arr = Array.isArray(ta.arr) ? ta.arr : [];
      const node = decodeConsoleValue(arr, depth);
      return node.t === "array" ? { ...node, label: String(ta.ctorName ?? "TypedArray") } : node;
    }
    case "[[ArrayBuffer]]": {
      const len = Array.isArray(data) ? data.length : 0;
      return { t: "object", entries: [["byteLength", { t: "num", v: String(len) }]] };
    }
    default:
      // Unknown transform: show whatever payload it carried.
      return decodeConsoleValue(data, depth);
  }
}

/** Child count for a container node (used for `Map(2)` / `Array(3)` labels). */
export function sizeOf(node: ConsoleNode): number {
  switch (node.t) {
    case "array":
    case "set":
      return node.items.length + (node.t === "array" ? node.more ?? 0 : 0);
    case "map":
      return node.entries.length;
    case "object":
      return node.entries.length + (node.more ?? 0);
    default:
      return 0;
  }
}

export function isContainer(node: ConsoleNode): boolean {
  return node.t === "array" || node.t === "set" || node.t === "map" || node.t === "object";
}

const IDENT = /^[A-Za-z_$][\w$]*$/;
function keyText(k: string): string {
  return IDENT.test(k) ? k : JSON.stringify(k);
}

/**
 * Devtools-style one-line preview. Top-level strings print bare (like
 * `console.log("hi")` in Chrome); nested strings are quoted. Containers
 * nested deeper than `previewDepth` collapse to `{…}` / `[…]`.
 */
export function formatConsoleValue(node: ConsoleNode, level = 0, previewDepth = 3): string {
  switch (node.t) {
    case "str":
      return level === 0 ? node.v : JSON.stringify(node.v);
    case "num":
      return node.v;
    case "bool":
      return String(node.v);
    case "null":
      return "null";
    case "undef":
      return "undefined";
    case "fn":
      return node.name ? `ƒ ${node.name}()` : "ƒ ()";
    case "date":
      return node.v;
    case "regexp":
      return node.v;
    case "error":
      return node.stack && level === 0 ? node.stack : `${node.name}: ${node.message}`;
    case "circular":
      return "[Circular]";
    case "element":
      return `<${node.v}>`;
    case "array": {
      const prefix = node.label ? `${node.label}(${sizeOf(node)}) ` : "";
      if (level >= previewDepth && sizeOf(node) > 0) return `${prefix}[…]`;
      const parts = node.items.map((x) => formatConsoleValue(x, level + 1, previewDepth));
      if (node.more) parts.push(`…${node.more} more`);
      return `${prefix}[${parts.join(", ")}]`;
    }
    case "set": {
      if (level >= previewDepth && node.items.length > 0) return `Set(${node.items.length}) {…}`;
      const parts = node.items.map((x) => formatConsoleValue(x, level + 1, previewDepth));
      return `Set(${node.items.length}) {${parts.join(", ")}}`;
    }
    case "map": {
      if (level >= previewDepth && node.entries.length > 0) return `Map(${node.entries.length}) {…}`;
      const parts = node.entries.map(
        ([k, v]) => `${formatConsoleValue(k, level + 1, previewDepth)} => ${formatConsoleValue(v, level + 1, previewDepth)}`,
      );
      return `Map(${node.entries.length}) {${parts.join(", ")}}`;
    }
    case "object": {
      if (level >= previewDepth && sizeOf(node) > 0) return "{…}";
      const parts = node.entries.map(([k, v]) => `${keyText(k)}: ${formatConsoleValue(v, level + 1, previewDepth)}`);
      if (node.more) parts.push(`…${node.more} more`);
      return `{${parts.join(", ")}}`;
    }
  }
}

/** Whole console call as one line — used for copy-to-clipboard and error rows. */
export function formatConsoleArgs(args: unknown[]): string {
  return args.map((a) => formatConsoleValue(decodeConsoleValue(a))).join(" ");
}

export { keyText as consoleKeyText };

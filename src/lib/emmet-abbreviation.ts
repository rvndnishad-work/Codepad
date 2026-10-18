/**
 * Emmet abbreviation detection + expansion for the Monaco playground
 * (HTML, JSX/TSX, CSS/SCSS/Less).
 *
 * Pure (no Monaco import) so it can be unit tested: give it the text before
 * the cursor and the Monaco language id, get back the snippet to insert and
 * how many characters of the abbreviation it replaces.
 *
 * Monaco's JavaScript/TypeScript tokenizer has no idea what JSX is, so JSX
 * locations are recognised from the text instead: the abbreviation must sit
 * right after a JSX tag (`<main>`, `</p>`, `<Counter />`, `<>`) or open a
 * `return (` / `=> (` block, and must start with an HTML tag, a capitalised
 * component, or emmet syntax (`.box`, `#id`, `ul>li*3`). That keeps plain
 * identifiers like `count` or `log` from turning into `<count></count>`.
 */
import expand, { extract } from "emmet";

export type EmmetExpansion = {
  /** The abbreviation as typed, e.g. `ul>li*3`. */
  abbreviation: string;
  /** Monaco snippet text with `${1}` tab stops. */
  snippet: string;
};

/** Only look this far back for context; keeps every keystroke cheap. */
const CONTEXT_CHARS = 4000;

const HTML_TAGS = new Set(
  (
    "a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption " +
    "cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset " +
    "figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins " +
    "kbd label legend li link main map mark menu meta meter nav noscript object ol optgroup option " +
    "output p picture pre progress q rp rt ruby s samp script search section select slot small source span " +
    "strong style sub summary sup table tbody td template textarea tfoot th thead time title tr track u " +
    "ul var video wbr svg path circle rect line polyline polygon g defs"
  ).split(" "),
);

const field = (index: number, placeholder: string) =>
  `\${${index}${placeholder ? `:${placeholder.replace(/[$}\\]/g, "\\$&")}` : ""}}`;

type Syntax = "html" | "jsx" | "css" | "scss" | "less";

function syntaxFor(language: string): Syntax | null {
  if (language === "html") return "html";
  if (language === "javascript" || language === "typescript") return "jsx";
  if (language === "css" || language === "scss" || language === "less") return language;
  return null;
}

/** True when the `>` at `gt` closes a JSX tag such as `<div className="a">`, `</p>`, `<X />` or `<>`. */
function closesJsxTag(text: string, gt: number): boolean {
  if (text[gt - 1] === "=") return false; // arrow function `=>`
  const lt = text.lastIndexOf("<", gt);
  if (lt < 0) return false;
  const tag = text.slice(lt, gt + 1);
  // `<>` / `</>` fragments, or `<Name ...>` / `</Name>` / `<Name ... />`.
  return /^<\/?>$/.test(tag) || /^<\/?[A-Za-z][\w.:-]*(\s[\s\S]*)?\/?>$/.test(tag);
}

function isJsxLocation(before: string): boolean {
  const trimmed = before.replace(/\s+$/, "");
  const last = trimmed[trimmed.length - 1];
  if (last === ">") return closesJsxTag(trimmed, trimmed.length - 1);
  if (last === "(") return /(?:\breturn|=>)\s*\($/.test(trimmed);
  return false;
}

function isHtmlLocation(before: string): boolean {
  // Inside a tag (`<div cla|`) or an attribute value.
  if (before.lastIndexOf("<") > before.lastIndexOf(">")) return false;
  const lower = before.toLowerCase();
  const inside = (open: string, close: string) => lower.lastIndexOf(open) > lower.lastIndexOf(close);
  if (inside("<!--", "-->") || inside("<script", "</script") || inside("<style", "</style")) return false;
  // The abbreviation has to start a word: after whitespace, `>`, or at the start.
  return before === "" || /[\s>]$/.test(before);
}

/** CSS abbreviations (`m10`, `df`) belong where a declaration starts inside a rule. */
function isStylesheetLocation(before: string): boolean {
  const depth = (before.match(/\{/g)?.length ?? 0) - (before.match(/\}/g)?.length ?? 0);
  if (depth <= 0) return false; // selector position
  if (/\/\*(?![\s\S]*\*\/)/.test(before)) return false; // inside a comment
  return before === "" || /[\s{;]$/.test(before);
}

/** JSX abbreviations must lead with something that is clearly markup. */
function looksLikeMarkup(abbreviation: string): boolean {
  if (/^[.#[({]/.test(abbreviation)) return true; // `.box` → <div className="box">
  const name = /^[A-Za-z][\w-]*/.exec(abbreviation)?.[0];
  if (!name) return false;
  if (/^[A-Z]/.test(name)) return true; // components: `Header`, `Card>Title`
  return HTML_TAGS.has(name);
}

/**
 * Expand the emmet abbreviation that ends at the cursor, or return null when
 * there is none or the cursor is not somewhere markup belongs.
 *
 * @param textBefore everything in the model before the cursor
 * @param language   Monaco language id of the model
 */
export function emmetExpansionAt(textBefore: string, language: string): EmmetExpansion | null {
  const syntax = syntaxFor(language);
  if (!syntax) return null;

  const text = textBefore.length > CONTEXT_CHARS ? textBefore.slice(-CONTEXT_CHARS) : textBefore;
  const lineStart = text.lastIndexOf("\n") + 1;
  const line = text.slice(lineStart);
  if (!line || /\s$/.test(line)) return null;

  const type = syntax === "html" || syntax === "jsx" ? "markup" : "stylesheet";
  const found = extract(line, line.length, { type, lookAhead: false });
  if (!found || !found.abbreviation || found.end !== line.length) return null;
  const { abbreviation } = found;
  const before = text.slice(0, lineStart + found.start);

  if (syntax === "jsx") {
    if (!looksLikeMarkup(abbreviation) || !isJsxLocation(before)) return null;
  } else if (syntax === "html") {
    if (!isHtmlLocation(before)) return null;
  } else if (!isStylesheetLocation(before)) {
    return null;
  }

  let snippet: string;
  try {
    snippet = expand(abbreviation, {
      type,
      syntax,
      options: {
        // Same cut-off VS Code uses, so `xyz` is not fuzzy-matched to a random property.
        "stylesheet.fuzzySearchMinScore": 0.3,
        "output.field": field,
        "output.indent": "\t",
        // JSX has no void tags: `<input>` must be written `<input />`.
        ...(syntax === "jsx" ? { "output.selfClosingStyle": "xhtml" as const } : {}),
      },
    });
  } catch {
    return null; // half-typed abbreviation such as `ul>`
  }
  // An expansion that only echoes the input back is not worth offering.
  // `abc` → `abc: ;` (unknown property) is noise too.
  if (!snippet || snippet === abbreviation || snippet === `${abbreviation}: \${0};`) return null;
  return { abbreviation, snippet };
}

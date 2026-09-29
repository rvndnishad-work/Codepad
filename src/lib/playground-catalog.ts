/**
 * The /playgrounds catalogue: what each template contains, where it runs,
 * and how the page groups and filters them. Pure, so the listing logic can
 * be unit-tested without rendering the page.
 */
import type { TemplateDef } from "./templates";

/** One line on what is inside each template, shown on its card. */
export const TEMPLATE_BLURBS: Record<string, string> = {
  react: "Header and counter components, 2 dependencies",
  vue: "Single-file header and counter components",
  angular: "Component, module and template, ready to run",
  svelte: "Header and counter components",
  solid: "Header and counter components in JSX",
  "react-hooks": "Custom useTimer and useSearch hooks",
  "react-classes": "Class components and lifecycle methods",
  "redux-toolkit": "Store and counter slice wired to React",
  mobx: "Observable counter store with mobx-react-lite",
  "framer-motion": "An animated box to tweak and replay",
  mui: "Themed counter card with MUI components",
  javascript: "Browser page with a helpers module",
  typescript: "Typed browser page with a helpers module",
  python: "Python 3 script with console output",
  go: "Go program with fmt output",
  java: "Java SE class with a main method",
  cpp: "Compiled and run on the server",
  rust: "Compiled and run on the server",
  node: "Node script with console output",
  "ts-node": "TypeScript run with Node on the server",
  "empty-js": "One index.js, output in the console",
  "empty-ts": "One index.ts, output in the console",
  "empty-react": "One App.js with React set up",
  "empty-vue": "One App.vue, nothing else",
  "empty-angular": "One component with Angular set up",
  "empty-svelte": "One App.svelte, nothing else",
  "empty-solid": "One App.tsx, nothing else",
};

export function templateBlurb(t: TemplateDef): string {
  return TEMPLATE_BLURBS[t.id] ?? t.subtitle ?? "Ready to run";
}

/** Backend templates run on the server (Piston); the rest in the browser. */
export function runsOnServer(t: TemplateDef): boolean {
  return t.group === "backend";
}

/** A group label without its parenthetical, e.g. "(JIT 0ms)". */
export function shortGroupLabel(label: string): string {
  return label.replace(/\s*\(.*\)\s*$/, "");
}

export function matchesQuery(t: TemplateDef, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    t.title.toLowerCase().includes(q) ||
    t.id.toLowerCase().includes(q) ||
    templateBlurb(t).toLowerCase().includes(q) ||
    (t.subtitle?.toLowerCase().includes(q) ?? false)
  );
}

export type CatalogSection = {
  key: string;
  label: string;
  items: TemplateDef[];
};

/**
 * Templates in their groups, in group order, filtered by the selected group
 * ("all" for every group) and the search query. Empty groups are dropped.
 * Popular templates stay in their own group too, so a group never looks
 * short because its members were promoted.
 */
export function catalogSections(
  templates: TemplateDef[],
  groups: { key: string; label: string }[],
  filter: string,
  query: string,
): CatalogSection[] {
  return groups
    .filter((g) => filter === "all" || g.key === filter)
    .map((g) => ({
      key: g.key,
      label: shortGroupLabel(g.label),
      items: templates.filter((t) => t.group === g.key && matchesQuery(t, query)),
    }))
    .filter((s) => s.items.length > 0);
}

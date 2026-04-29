// Lazy-loaded Prettier formatter for the active file in the playground.
// Plugins are loaded on first use to keep the initial bundle small.

type Parsers = "babel" | "babel-ts" | "html" | "css" | "scss" | "json" | "markdown";

function parserFor(path: string): Parsers | null {
  const ext = path.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  switch (ext) {
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return "babel";
    case "ts":
    case "tsx":
      return "babel-ts";
    case "html":
    case "htm":
    case "vue":
    case "svelte":
      return "html";
    case "css":
      return "css";
    case "scss":
    case "sass":
    case "less":
      return "scss";
    case "json":
      return "json";
    case "md":
    case "mdx":
      return "markdown";
    default:
      return null;
  }
}

export async function formatCode(
  path: string,
  code: string
): Promise<{ ok: true; code: string } | { ok: false; reason: string }> {
  const parser = parserFor(path);
  if (!parser) return { ok: false, reason: "Unsupported file type" };

  const [
    prettier,
    babel,
    estree,
    typescript,
    html,
    postcss,
    markdown,
  ] = await Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/babel"),
    import("prettier/plugins/estree"),
    import("prettier/plugins/typescript"),
    import("prettier/plugins/html"),
    import("prettier/plugins/postcss"),
    import("prettier/plugins/markdown"),
  ]);

  try {
    const formatted = await prettier.format(code, {
      parser,
      plugins: [
        babel.default ?? babel,
        estree.default ?? estree,
        typescript.default ?? typescript,
        html.default ?? html,
        postcss.default ?? postcss,
        markdown.default ?? markdown,
      ],
      semi: true,
      singleQuote: false,
      tabWidth: 2,
      printWidth: 80,
    });
    return { ok: true, code: formatted };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, reason };
  }
}

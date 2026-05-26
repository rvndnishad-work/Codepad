import Link from "next/link";
import { headers } from "next/headers";
import {
  KeyRound,
  Terminal,
  Sparkles,
  Bot,
  BookOpen,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import {
  MCP_TOOLS,
  MCP_RESOURCES,
  MCP_PROMPTS,
  MCP_PUBLIC_TOOLS,
  type ToolCatalogEntry,
} from "@/lib/mcp/catalog";
import { AI_CREDIT_PACKS } from "@/lib/ai-interview/credits";
import CopyButton from "./CopyButton";

export const metadata = {
  title: "MCP API — Interviewpad",
  description:
    "Connect Claude, Cursor, Goose, or any MCP-compatible client to your Interviewpad workspace. Tools, resources, and prompts reference.",
};

async function resolveOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  } catch {
    /* ignore */
  }
  return process.env.NEXTAUTH_URL || "https://interviewpad.in";
}

export default async function McpDocsPage() {
  const origin = await resolveOrigin();
  const url = `${origin}/api/mcp`;
  const publicUrl = `${origin}/api/mcp/public`;

  // Pre-rendered install snippets with a placeholder key.
  const claudeDesktopSnippet = JSON.stringify(
    {
      mcpServers: {
        interviewpad: {
          command: "npx",
          args: ["-y", "mcp-remote", url, "--header", "Authorization:Bearer YOUR_KEY_HERE"],
        },
      },
    },
    null,
    2
  );
  const cursorSnippet = JSON.stringify(
    {
      mcpServers: {
        interviewpad: {
          url,
          headers: { Authorization: "Bearer YOUR_KEY_HERE" },
        },
      },
    },
    null,
    2
  );
  const publicSnippet = JSON.stringify(
    {
      mcpServers: {
        "interviewpad-public": {
          url: publicUrl,
        },
      },
    },
    null,
    2
  );

  return (
    <div className="min-h-screen bg-bg text-fg font-sans">
      <div className="mx-auto max-w-4xl px-6 py-16 space-y-12">
        {/* Header */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest">
            <Sparkles className="w-3 h-3" /> Interviewpad × MCP
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Talk to your hiring pipeline from any AI assistant.
          </h1>
          <p className="text-lg text-muted/90 leading-relaxed max-w-2xl">
            Interviewpad ships a Model Context Protocol server. Drop it into Claude
            Desktop, Cursor, Goose, or anything else that speaks MCP, and your
            candidates, screenings, and scorecards become first-class context for
            your AI work.
          </p>
        </header>

        {/* What is MCP — short explainer */}
        <section className="rounded-2xl border border-border bg-surface p-6 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" /> What is MCP?
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            The{" "}
            <Link
              href="https://modelcontextprotocol.io"
              target="_blank"
              className="text-accent underline underline-offset-2"
            >
              Model Context Protocol
            </Link>{" "}
            is an open standard for connecting LLMs to external tools and data. An
            MCP server (this) exposes tools / resources / prompts; an MCP client
            (Claude Desktop, Cursor, etc.) consumes them. Same idea as language
            servers, but for AI assistants.
          </p>
          <p className="text-sm text-muted leading-relaxed">
            You don&apos;t write any code to use it. Mint an API key from your
            workspace, paste the install snippet into your client&apos;s config,
            and the tools show up.
          </p>
        </section>

        {/* Quick start */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-accent" /> Quick start
          </h2>
          <ol className="space-y-3 list-decimal pl-5 text-sm text-fg/90 leading-relaxed">
            <li>
              In your workspace, go to{" "}
              <span className="font-mono text-accent">Automation → MCP API Keys</span>{" "}
              and click <strong>Generate API key</strong>. Pick{" "}
              <span className="font-bold text-emerald-400">read</span> for analytics
              access or <span className="font-bold text-amber-400">read + write</span> to
              create screenings and update candidates from your assistant.
            </li>
            <li>Copy the key. You only see it once.</li>
            <li>Paste the install snippet below into your MCP client&apos;s config.</li>
            <li>Restart the client. Ask &quot;what tools do you have for Interviewpad?&quot;</li>
          </ol>
        </section>

        {/* Install snippets */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black tracking-tight">Install</h2>

          <SnippetCard
            title="Claude Desktop"
            subtitle={
              <>
                Edit{" "}
                <code className="font-mono text-xs bg-panel px-1.5 py-0.5 rounded">
                  %APPDATA%\Claude\claude_desktop_config.json
                </code>{" "}
                (Windows) or{" "}
                <code className="font-mono text-xs bg-panel px-1.5 py-0.5 rounded">
                  ~/Library/Application Support/Claude/claude_desktop_config.json
                </code>{" "}
                (macOS). Restart Claude Desktop after saving.
              </>
            }
            code={claudeDesktopSnippet}
          />

          <SnippetCard
            title="Cursor / Goose"
            subtitle="For clients that speak the MCP Streamable HTTP transport natively. Add to your MCP settings."
            code={cursorSnippet}
          />

          <SnippetCard
            title="Smoke test with curl"
            subtitle="Lists the available tools. Use this to verify your key works before touching client config."
            code={`curl -X POST '${url}' \\
  -H 'Authorization: Bearer YOUR_KEY_HERE' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json, text/event-stream' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`}
          />
        </section>

        {/* Tools reference */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Bot className="w-5 h-5 text-accent" /> Tools
          </h2>
          <p className="text-sm text-muted/90 leading-relaxed">
            {MCP_TOOLS.filter((t) => t.scope === "read").length} read tools available
            on any key.{" "}
            {MCP_TOOLS.filter((t) => t.scope === "write").length} write tools require
            a key minted with <span className="font-bold text-amber-400">read + write</span>.
          </p>
          <div className="space-y-3">
            {MCP_TOOLS.map((t) => (
              <ToolCard key={t.name} tool={t} />
            ))}
          </div>
        </section>

        {/* Resources reference */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black tracking-tight">Resources</h2>
          <p className="text-sm text-muted/90 leading-relaxed">
            Read-only fetch-by-URI surfaces. Useful when you want raw JSON instead
            of a summarized tool result.
          </p>
          <div className="space-y-2">
            {MCP_RESOURCES.map((r) => (
              <div key={r.name} className="rounded-xl border border-border bg-surface p-4">
                <div className="font-mono text-xs text-accent">{r.uri}</div>
                <div className="text-[11px] text-muted/60 font-mono mt-0.5">{r.mimeType}</div>
                <p className="text-sm text-fg/80 mt-1.5">{r.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Prompts reference */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black tracking-tight">Prompts</h2>
          <p className="text-sm text-muted/90 leading-relaxed">
            Pre-canned conversation starters with real workspace data inlined.
            Useful for "do this thing on this specific candidate."
          </p>
          <div className="space-y-2">
            {MCP_PROMPTS.map((p) => (
              <div key={p.name} className="rounded-xl border border-border bg-surface p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-fg">{p.name}</span>
                  <span className="text-xs text-muted">— {p.title}</span>
                </div>
                <p className="text-sm text-fg/80">{p.description}</p>
                <div className="text-[11px] font-mono text-muted/80 bg-bg/60 border border-border/60 rounded-md p-2 space-y-0.5">
                  {p.args.map((a) => (
                    <div key={a.name}>
                      <span className="text-accent">{a.name}</span>
                      {a.required ? "" : "?"}: {a.description}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Public discovery */}
        <section className="rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.04] p-6 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" /> No-auth discovery
            endpoint
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            We also expose <code className="font-mono text-xs bg-panel px-1.5 py-0.5 rounded">{publicUrl}</code>{" "}
            with read-only catalog tools — no API key required. Add it to your
            client and AI assistants can answer questions like &quot;what AI screening
            templates does Interviewpad offer?&quot; without anyone having an account.
          </p>
          <SnippetCard
            title="Public install"
            subtitle="No key required. Read-only template + pricing catalog."
            code={publicSnippet}
          />
          <div className="text-[11px] text-muted/70">
            Public tools: {MCP_PUBLIC_TOOLS.map((t) => t.name).join(", ")}
          </div>
        </section>

        {/* Plans / pricing teaser */}
        <section className="rounded-2xl border border-border bg-surface p-6 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-400" /> Plans
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            MCP API access is included on <strong className="text-fg">Growth</strong>{" "}
            and <strong className="text-fg">Enterprise</strong> workspaces. Free /
            Starter workspaces can browse this page but can&apos;t mint keys.
          </p>
          <p className="text-sm text-muted leading-relaxed">
            Credits: {AI_CREDIT_PACKS.map((p) => `${p.credits} for $${p.priceCents / 100}`).join(" · ")}.{" "}
            <Link href="/pricing" className="text-accent underline underline-offset-2">
              See plans
            </Link>{" "}
            for full details.
          </p>
        </section>

        {/* Auth + security */}
        <section className="space-y-3">
          <h2 className="text-2xl font-black tracking-tight">Auth &amp; security</h2>
          <ul className="space-y-2 text-sm text-fg/85 list-disc pl-5">
            <li>
              <strong>Bearer keys.</strong> Every call needs{" "}
              <code className="font-mono text-xs bg-panel px-1.5 py-0.5 rounded">
                Authorization: Bearer ip_live_...
              </code>
              .
            </li>
            <li>
              <strong>Hashed at rest.</strong> Only the SHA-256 hash of your key is
              stored. We can&apos;t recover the plaintext. Lost it? Revoke and
              re-issue.
            </li>
            <li>
              <strong>Workspace-scoped.</strong> Each key is tied to exactly one
              workspace. Cross-workspace data is unreachable — the server returns
              404-style errors instead of leaking row counts.
            </li>
            <li>
              <strong>Audited.</strong> Every tool/resource/prompt invocation lands
              in your workspace audit log: tool name, args, result summary, latency,
              error if any.
            </li>
            <li>
              <strong>Rate-limited.</strong> 60 requests per minute per key.
            </li>
            <li>
              <strong>Plan-gated.</strong> Keys stop working immediately if the
              workspace is downgraded off Growth/Enterprise.
            </li>
          </ul>
        </section>

        <footer className="pt-8 border-t border-border text-xs text-muted/70 flex items-center justify-between">
          <span>
            Open source standard:{" "}
            <Link
              href="https://modelcontextprotocol.io"
              target="_blank"
              className="text-accent underline underline-offset-2 inline-flex items-center gap-1"
            >
              modelcontextprotocol.io <ExternalLink className="w-3 h-3" />
            </Link>
          </span>
          <Link href="/" className="text-accent underline underline-offset-2">
            ← Back to Interviewpad
          </Link>
        </footer>
      </div>
    </div>
  );
}

function ToolCard({ tool }: { tool: ToolCatalogEntry }) {
  const scopeBadgeCls =
    tool.scope === "write"
      ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-sm font-bold text-fg">{tool.name}</span>
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${scopeBadgeCls}`}
        >
          {tool.scope}
        </span>
        <span className="text-xs text-muted">— {tool.title}</span>
      </div>
      <p className="text-sm text-fg/80 leading-relaxed">{tool.description}</p>
      {tool.args && tool.args.length > 0 && (
        <div className="text-[11px] font-mono text-muted/80 bg-bg/60 border border-border/60 rounded-md p-2 space-y-0.5">
          {tool.args.map((a) => (
            <div key={a.name}>
              <span className="text-accent">{a.name}</span>
              {a.required ? "" : "?"} <span className="text-muted/60">({a.type})</span>:{" "}
              {a.description}
            </div>
          ))}
        </div>
      )}
      {tool.example && (
        <div className="text-[11px] font-mono text-emerald-300/90 bg-bg/60 border border-emerald-500/15 rounded-md p-2">
          {tool.example}
        </div>
      )}
    </div>
  );
}

function SnippetCard({
  title,
  subtitle,
  code,
}: {
  title: string;
  subtitle: React.ReactNode;
  code: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-fg">{title}</div>
          <div className="text-[11px] text-muted/70 mt-0.5">{subtitle}</div>
        </div>
        <CopyButton text={code} />
      </div>
      <pre className="text-[11px] font-mono text-fg/90 bg-bg p-3 rounded-lg border border-border/50 overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

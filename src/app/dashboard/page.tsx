import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Plus, Save, Share2, Code2, ArrowRight, Sparkles } from "lucide-react";
import DashboardList from "./DashboardList";
import { TemplateLogo } from "@/lib/icons";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const items = await prisma.snippet.findMany({
    where: { userId: session.user.id },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      template: true,
      updatedAt: true,
      visibility: true,
      tags: true,
      pinned: true,
    },
  });

  const initial = items.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    template: s.template,
    updatedAt: s.updatedAt.toISOString(),
    visibility: s.visibility as "public" | "private",
    tags: parseTags(s.tags),
    pinned: s.pinned,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My snippets</h1>
          <p className="text-muted text-sm mt-1">
            {items.length} saved ·{" "}
            {items.filter((i) => i.visibility === "public").length} public
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent hover:bg-accent-soft text-white text-sm shadow-soft transition"
        >
          <Plus className="w-4 h-4" />
          New snippet
        </Link>
      </div>

      {items.length === 0 ? (
        <FirstRunOnboarding firstName={session.user?.name?.split(" ")[0] ?? null} />
      ) : (
        <DashboardList initial={initial} />
      )}
    </div>
  );
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === "string")
      : [];
  } catch {
    return [];
  }
}

const QUICK_STARTS = [
  { id: "react", label: "React", description: "Hooks, JSX, hot reload" },
  { id: "javascript", label: "JavaScript", description: "Pure ES modules" },
  { id: "typescript", label: "TypeScript", description: "Strict types ready" },
];

const STEPS = [
  {
    icon: Code2,
    title: "Pick a template",
    body: "16 pre-wired starters for React, Vue, Svelte, JS, TS — and more. Edit instantly in the browser.",
  },
  {
    icon: Save,
    title: "Save your snippet",
    body: "Hit Ctrl/Cmd+S or click Save. We auto-save every change after that. Tag and pin from this dashboard.",
  },
  {
    icon: Share2,
    title: "Share or embed it",
    body: "Mark public to get a shareable link, fork link, and an embeddable iframe — all from the toolbar.",
  },
];

function FirstRunOnboarding({ firstName }: { firstName: string | null }) {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-panel/70 p-8">
        <div className="absolute inset-0 bg-hero-glow opacity-50 pointer-events-none" />
        <div
          className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none"
          style={{ backgroundSize: "24px 24px" }}
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-panel/60 px-3 py-1 text-[11px] text-subtle mb-4">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Welcome to Codepad{firstName ? `, ${firstName}` : ""}</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Create your first snippet
          </h2>
          <p className="mt-2 text-muted text-sm max-w-md">
            Three steps and you're up. Pick any template below to get started —
            this dashboard fills up with everything you save.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {QUICK_STARTS.map((q) => (
              <Link
                key={q.id}
                href={`/play?template=${q.id}`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface/70 hover:bg-elevated p-3 transition"
              >
                <div className="w-9 h-9 rounded-lg border border-border bg-panel grid place-items-center shrink-0">
                  <TemplateLogo id={q.id} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{q.label}</div>
                  <div className="text-[11px] text-muted truncate">
                    {q.description}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted group-hover:text-fg transition shrink-0" />
              </Link>
            ))}
          </div>

          <div className="mt-3 text-center">
            <Link
              href="/"
              className="text-xs text-muted hover:text-fg transition"
            >
              Or browse all 16 templates →
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className="rounded-xl border border-border bg-panel/40 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-accent-glow border border-accent/30 grid place-items-center">
                  <Icon className="w-3.5 h-3.5 text-accent" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider text-muted uppercase">
                  Step {i + 1}
                </span>
              </div>
              <div className="text-sm font-medium text-fg mb-1">{s.title}</div>
              <p className="text-[11px] text-muted leading-relaxed">{s.body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

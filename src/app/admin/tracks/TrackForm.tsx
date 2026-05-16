"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Mail,
  MessageCircle,
  Plus,
  Save,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

export type TrackFormItem = {
  challengeId: string;
  note?: string | null;
  /** Optional walkthrough URL (YouTube/Vimeo/Loom auto-embed, others link out). */
  videoUrl?: string | null;
  /** Optional longer hint surfaced behind a "Show hint" toggle on the attempt page. */
  hint?: string | null;
  // Denormalised display fields from the parent server fetch.
  title: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  category: string | null;
};

export type TrackFormInput = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  tagline: string;
  coverImage: string;
  tech: string;
  tagsCsv: string;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  published: boolean;
  /** "public" → listed on /challenges; "private" → invitation-only. */
  visibility: "public" | "private";
  featured: boolean;
  items: TrackFormItem[];
};

export type AvailableChallenge = {
  id: string;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  category: string | null;
};

const TECH_OPTIONS = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "node", label: "Node" },
  { value: "algorithms", label: "Algorithms" },
  { value: "general", label: "General" },
];

const DIFFICULTIES: TrackFormInput["difficulty"][] = [
  "easy",
  "medium",
  "hard",
  "mixed",
];

export type TrackFormSurface = {
  /** Path to navigate to after a successful save or delete. */
  redirectTo: string;
  /** API endpoint for create (POST) — used when mode === "create". */
  createEndpoint: string;
  /**
   * API endpoint for update/delete (PATCH/DELETE). Plain string — must be
   * a serializable primitive because this prop crosses the server→client
   * component boundary. Caller is responsible for inlining the track id
   * (only needed in edit mode; create mode can pass any non-empty string).
   */
  itemEndpoint: string;
  /** Show the admin-only Featured toggle? */
  allowFeatured: boolean;
};

export default function TrackForm({
  mode,
  initial,
  availableChallenges,
  surface,
}: {
  mode: "create" | "edit";
  initial: TrackFormInput;
  availableChallenges: AvailableChallenge[];
  surface: TrackFormSurface;
}) {
  const router = useRouter();
  const [form, setForm] = useState<TrackFormInput>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  function update<K extends keyof TrackFormInput>(key: K, value: TrackFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const selectedIds = useMemo(
    () => new Set(form.items.map((it) => it.challengeId)),
    [form.items]
  );

  const pickerCandidates = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return availableChallenges
      .filter((c) => !selectedIds.has(c.id))
      .filter((c) =>
        !q
          ? true
          : c.title.toLowerCase().includes(q) ||
            (c.category ?? "").toLowerCase().includes(q)
      );
  }, [availableChallenges, selectedIds, pickerQuery]);

  function addChallenge(c: AvailableChallenge) {
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          challengeId: c.id,
          note: null,
          videoUrl: null,
          hint: null,
          title: c.title,
          difficulty: c.difficulty,
          estimatedMinutes: c.estimatedMinutes,
          category: c.category,
        },
      ],
    }));
  }

  function removeItem(idx: number) {
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== idx),
    }));
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= form.items.length) return;
    setForm((f) => {
      const next = [...f.items];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...f, items: next };
    });
  }

  function setItemNote(idx: number, note: string) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, note } : it)),
    }));
  }

  function setItemVideo(idx: number, videoUrl: string) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, videoUrl } : it)),
    }));
  }

  function setItemHint(idx: number, hint: string) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, hint } : it)),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.slug.trim() || !form.title.trim() || !form.description.trim()) {
      toast.error("Title, slug, and description are required");
      return;
    }
    if (form.items.length === 0) {
      toast.error("Add at least one challenge to the track");
      return;
    }

    const tags = form.tagsCsv
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      description: form.description,
      tagline: form.tagline.trim(),
      coverImage: form.coverImage.trim(),
      tech: form.tech,
      tags,
      difficulty: form.difficulty,
      published: form.published,
      visibility: form.visibility,
      // Only include `featured` when the surface supports it — user-authored
      // tracks can't self-feature, the field stays at its server-side default.
      ...(surface.allowFeatured ? { featured: form.featured } : {}),
      items: form.items.map((it) => ({
        challengeId: it.challengeId,
        note: it.note || undefined,
        videoUrl: it.videoUrl || undefined,
        hint: it.hint || undefined,
      })),
    };

    setSubmitting(true);
    try {
      const url = mode === "create" ? surface.createEndpoint : surface.itemEndpoint;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      toast.success(mode === "create" ? "Track created" : "Track updated");
      router.push(surface.redirectTo);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!form.id) return;
    if (!confirm(`Delete track "${form.title}"? Enrollments are kept; only the track and its item list are removed.`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(surface.itemEndpoint, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Track deleted");
      router.push(surface.redirectTo);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const totalMinutes = form.items.reduce(
    (s, it) => s + it.estimatedMinutes,
    0
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/admin/tracks"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-fg transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to tracks
        </Link>
        <div className="flex items-center gap-2">
          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 transition disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-bg text-xs font-black hover:bg-accent-soft transition disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" />
            {mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <FieldCard label="Title">
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="JavaScript Series — Warmups"
              className={baseInput}
            />
          </FieldCard>

          <FieldCard label="Slug (URL fragment)">
            <input
              value={form.slug}
              onChange={(e) => update("slug", e.target.value)}
              placeholder="javascript-warmups"
              className={`${baseInput} font-mono`}
            />
            <div className="text-[10px] text-muted/60 mt-1">
              /tracks/<span className="font-mono">{form.slug || "your-slug"}</span>
            </div>
          </FieldCard>

          <FieldCard label="Tagline (shown on cards)">
            <input
              value={form.tagline}
              onChange={(e) => update("tagline", e.target.value)}
              placeholder="Six short challenges to refresh ES2020+ fundamentals."
              className={baseInput}
            />
          </FieldCard>

          <FieldCard label="Description (Markdown)">
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={6}
              placeholder={"What's this track about? Who's it for?"}
              className={`${baseInput} font-mono text-xs`}
            />
          </FieldCard>

          <ChallengePickerBlock
            items={form.items}
            totalMinutes={totalMinutes}
            onMove={move}
            onRemove={removeItem}
            onNote={setItemNote}
            onVideo={setItemVideo}
            onHint={setItemHint}
            onOpenPicker={() => setPickerOpen((v) => !v)}
            pickerOpen={pickerOpen}
            pickerQuery={pickerQuery}
            onPickerQueryChange={setPickerQuery}
            pickerCandidates={pickerCandidates}
            onAdd={addChallenge}
          />
        </div>

        <div className="space-y-4">
          <FieldCard label="Tech">
            <select
              value={form.tech}
              onChange={(e) => update("tech", e.target.value)}
              className={baseInput}
            >
              {TECH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FieldCard>

          <FieldCard label="Difficulty">
            <div className="flex flex-wrap gap-1.5">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => update("difficulty", d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition border ${
                    form.difficulty === d
                      ? "bg-accent text-bg border-accent"
                      : "bg-surface text-muted border-border hover:text-fg hover:border-border-strong"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </FieldCard>

          <FieldCard label="Cover image URL (optional)">
            <input
              value={form.coverImage}
              onChange={(e) => update("coverImage", e.target.value)}
              placeholder="https://…"
              className={`${baseInput} font-mono text-xs`}
            />
          </FieldCard>

          <FieldCard label="Tags (comma-separated)">
            <input
              value={form.tagsCsv}
              onChange={(e) => update("tagsCsv", e.target.value)}
              placeholder="closures, promises, async"
              className={baseInput}
            />
          </FieldCard>

          <FieldCard label="Visibility">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => update("published", e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              Published
            </label>
            <div className="text-[10px] text-muted/60 mt-1 leading-relaxed">
              Unpublished tracks are visible only to you (and admins).
            </div>

            {form.published && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted">
                  Who can see it
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={form.visibility === "public"}
                    onChange={() => update("visibility", "public")}
                    className="mt-0.5 accent-accent"
                  />
                  <div className="text-sm">
                    <div className="font-bold text-fg">Public</div>
                    <div className="text-[11px] text-muted/70">
                      Listed on /challenges. Anyone can view and enroll.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={form.visibility === "private"}
                    onChange={() => update("visibility", "private")}
                    className="mt-0.5 accent-accent"
                  />
                  <div className="text-sm">
                    <div className="font-bold text-fg">Private</div>
                    <div className="text-[11px] text-muted/70">
                      Unlisted. Only people you invite can open the link.
                    </div>
                  </div>
                </label>
              </div>
            )}

            {surface.allowFeatured && (
              <label className="flex items-center gap-2 cursor-pointer text-sm mt-3 pt-3 border-t border-border">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => update("featured", e.target.checked)}
                  className="w-4 h-4 accent-accent"
                />
                Featured (Staff pick)
              </label>
            )}
          </FieldCard>

          {mode === "edit" &&
            form.id &&
            form.published &&
            form.visibility === "private" && (
              <InvitationManager trackId={form.id} trackSlug={form.slug} />
            )}
        </div>
      </div>
    </form>
  );
}

const baseInput =
  "w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition";

function FieldCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}

function ChallengePickerBlock({
  items,
  totalMinutes,
  onMove,
  onRemove,
  onNote,
  onVideo,
  onHint,
  onOpenPicker,
  pickerOpen,
  pickerQuery,
  onPickerQueryChange,
  pickerCandidates,
  onAdd,
}: {
  items: TrackFormItem[];
  totalMinutes: number;
  onMove: (idx: number, dir: -1 | 1) => void;
  onRemove: (idx: number) => void;
  onNote: (idx: number, note: string) => void;
  onVideo: (idx: number, videoUrl: string) => void;
  onHint: (idx: number, hint: string) => void;
  onOpenPicker: () => void;
  pickerOpen: boolean;
  pickerQuery: string;
  onPickerQueryChange: (v: string) => void;
  pickerCandidates: AvailableChallenge[];
  onAdd: (c: AvailableChallenge) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
            Challenges in this track
          </div>
          <div className="text-xs text-muted mt-0.5">
            {items.length} {items.length === 1 ? "item" : "items"} ·{" "}
            <span className="tabular-nums">{totalMinutes}m</span> total
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenPicker}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent border border-accent/30 text-xs font-bold hover:bg-accent/20 transition"
        >
          {pickerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {pickerOpen ? "Close picker" : "Add challenges"}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-xs text-muted/60 italic py-4 text-center border border-dashed border-border rounded-lg">
          No challenges yet. Use &quot;Add challenges&quot; above to build the order.
        </div>
      ) : (
        <ol className="space-y-2">
          {items.map((it, i) => (
            <li
              key={it.challengeId}
              className="flex items-start gap-2 p-3 rounded-lg bg-elevated/30 border border-border"
            >
              <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                <button
                  type="button"
                  onClick={() => onMove(i, -1)}
                  disabled={i === 0}
                  className="w-5 h-5 rounded grid place-items-center text-muted hover:text-fg hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Move up"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(i, 1)}
                  disabled={i === items.length - 1}
                  className="w-5 h-5 rounded grid place-items-center text-muted hover:text-fg hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Move down"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
              <div className="w-7 h-7 rounded-md bg-bg/40 border border-border grid place-items-center text-[11px] font-black text-muted shrink-0">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-fg truncate">{it.title}</span>
                  <DifficultyPill difficulty={it.difficulty} />
                  <span className="text-[10px] text-muted shrink-0 tabular-nums">
                    {it.estimatedMinutes}m
                  </span>
                </div>
                <textarea
                  value={it.note ?? ""}
                  onChange={(e) => onNote(i, e.target.value)}
                  rows={1}
                  placeholder="Short author note (one line — shown on the track detail page)"
                  className="w-full bg-bg/40 border border-border rounded-md px-2 py-1.5 text-[11px] text-fg placeholder:text-muted/40 focus:outline-none focus:border-border-strong resize-none"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted block mb-1">
                      Video URL (optional)
                    </span>
                    <input
                      value={it.videoUrl ?? ""}
                      onChange={(e) => onVideo(i, e.target.value)}
                      placeholder="https://youtube.com/watch?v=…"
                      className="w-full bg-bg/40 border border-border rounded-md px-2 py-1.5 text-[11px] font-mono text-fg placeholder:text-muted/40 focus:outline-none focus:border-border-strong"
                    />
                    <span className="text-[9px] text-muted/50 block mt-1">
                      YouTube / Vimeo / Loom auto-embed on the attempt page.
                    </span>
                  </label>
                  <label className="block">
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted block mb-1">
                      Hint (optional, behind a toggle)
                    </span>
                    <textarea
                      value={it.hint ?? ""}
                      onChange={(e) => onHint(i, e.target.value)}
                      rows={2}
                      placeholder="Hidden by default — participants tap 'Show hint' to reveal."
                      className="w-full bg-bg/40 border border-border rounded-md px-2 py-1.5 text-[11px] text-fg placeholder:text-muted/40 focus:outline-none focus:border-border-strong resize-y"
                    />
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="w-7 h-7 rounded grid place-items-center text-muted hover:text-rose-500 hover:bg-rose-500/10 transition shrink-0"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}

      {pickerOpen && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              value={pickerQuery}
              onChange={(e) => onPickerQueryChange(e.target.value)}
              placeholder="Search published challenges by title or category…"
              className="w-full pl-10 pr-3 py-2 bg-elevated/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          {pickerCandidates.length === 0 ? (
            <div className="text-xs text-muted/60 italic py-4 text-center">
              No matching challenges
              {items.length > 0 ? " not already in this track." : "."}
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto space-y-1 pr-1">
              {pickerCandidates.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onAdd(c)}
                    className="group w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-elevated text-left transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-muted group-hover:text-accent transition shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-fg truncate">{c.title}</span>
                        <DifficultyPill difficulty={c.difficulty} />
                        <span className="text-[10px] text-muted shrink-0 tabular-nums">
                          {c.estimatedMinutes}m
                        </span>
                      </div>
                      {c.category && (
                        <div className="text-[10px] text-muted/60 uppercase tracking-wider mt-0.5">
                          {c.category}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function DifficultyPill({
  difficulty,
}: {
  difficulty: "easy" | "medium" | "hard";
}) {
  const tone =
    difficulty === "easy"
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
      : difficulty === "medium"
      ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
      : "text-rose-500 bg-rose-500/10 border-rose-500/30";
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${tone} shrink-0`}
    >
      {difficulty}
    </span>
  );
}

/* ─────────────────────────── Invitation manager ─────────────────────────── */

type Invitation = {
  id: string;
  email: string;
  token: string;
  status: string;
  acceptedAt: string | null;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null } | null;
};

/**
 * Sits in the sidebar when the track is published+private. Loads existing
 * invitations once on mount, then manages them client-side with optimistic
 * updates. Each row exposes copy-link, mail, WhatsApp, and revoke actions.
 * Authors share the magic link themselves — no backend mail integration.
 */
function InvitationManager({
  trackId,
  trackSlug,
}: {
  trackId: string;
  trackSlug: string;
}) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/tracks/${trackId}/invites`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = (await res.json()) as { invitations: Invitation[] };
        if (!cancelled) setInvitations(data.invitations);
      } catch (err) {
        if (!cancelled) toast.error("Couldn't load invitations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trackId]);

  async function addInvites() {
    const emails = emailInput
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      toast.error("Enter at least one email");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/tracks/${trackId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? `Status ${res.status}`);
      }
      const data = (await res.json()) as { invitations: Invitation[] };
      setInvitations(data.invitations);
      setEmailInput("");
      toast.success(`Invited ${emails.length} ${emails.length === 1 ? "person" : "people"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(inviteId: string) {
    if (!confirm("Revoke this invitation? The magic link will stop working.")) return;
    const snapshot = invitations;
    setInvitations((prev) =>
      prev.map((i) => (i.id === inviteId ? { ...i, status: "revoked" } : i))
    );
    try {
      const res = await fetch(`/api/tracks/${trackId}/invites/${inviteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Invitation revoked");
    } catch (err) {
      setInvitations(snapshot);
      toast.error("Couldn't revoke");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted mb-2">
        Invitations
      </div>
      <p className="text-[11px] text-muted/70 leading-relaxed mb-3">
        Add emails below to generate share links. Send the link through
        email or WhatsApp — recipients sign in (or sign up) and the magic
        link grants them access.
      </p>

      <div className="flex flex-col gap-2 mb-3">
        <textarea
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          rows={2}
          placeholder="alice@example.com, bob@example.com"
          className="w-full bg-bg/40 border border-border rounded-md px-2 py-1.5 text-xs text-fg placeholder:text-muted/40 focus:outline-none focus:border-border-strong resize-y"
        />
        <button
          type="button"
          onClick={addInvites}
          disabled={busy || !emailInput.trim()}
          className="self-end inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-bg text-xs font-black hover:bg-accent-soft transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Invite
        </button>
      </div>

      {loading ? (
        <div className="text-[11px] text-muted/60 italic py-2 text-center">
          Loading…
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-[11px] text-muted/60 italic py-2 text-center border border-dashed border-border rounded-md">
          No invitations yet.
        </div>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {invitations.map((inv) => (
            <li key={inv.id}>
              <InviteRow
                invitation={inv}
                trackSlug={trackSlug}
                onRevoke={revoke}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InviteRow({
  invitation,
  trackSlug,
  onRevoke,
}: {
  invitation: Invitation;
  trackSlug: string;
  onRevoke: (id: string) => void;
}) {
  // Build the magic link relative to the current host so it works in both
  // dev and prod without hard-coded URLs. Falls back gracefully during SSR
  // (window is undefined) — the row only renders inside a client component.
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/tracks/${trackSlug}?invite=${invitation.token}`
      : `/tracks/${trackSlug}?invite=${invitation.token}`;

  const subject = encodeURIComponent(`You're invited to a coding track`);
  const body = encodeURIComponent(
    `Hi,\n\nI'd like to invite you to a private coding track on Interviewpad. Open the link below to get started:\n\n${link}\n\n— sent from Interviewpad`
  );
  const mailHref = `mailto:${invitation.email}?subject=${subject}&body=${body}`;
  const waText = encodeURIComponent(
    `Hey — I'd like to invite you to a private coding track on Interviewpad: ${link}`
  );
  const waHref = `https://wa.me/?text=${waText}`;

  const tone =
    invitation.status === "accepted"
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
      : invitation.status === "revoked"
      ? "text-muted/60 bg-muted/10 border-border"
      : "text-amber-500 bg-amber-500/10 border-amber-500/30";

  const revoked = invitation.status === "revoked";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <div
      className={`flex flex-col gap-2 p-2.5 rounded-lg border bg-elevated/30 ${
        revoked ? "opacity-50" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-xs font-mono text-fg truncate" title={invitation.email}>
          {invitation.email}
        </span>
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${tone}`}
        >
          {invitation.status}
        </span>
      </div>
      {!revoked && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-bg/60 border border-border text-[10px] font-bold text-fg hover:border-border-strong transition"
            title="Copy magic link"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
          <a
            href={mailHref}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-bg/60 border border-border text-[10px] font-bold text-fg hover:border-border-strong transition"
            title="Send via email"
          >
            <Mail className="w-3 h-3" />
            Email
          </a>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-500 hover:bg-emerald-500/20 transition"
            title="Share via WhatsApp"
          >
            <MessageCircle className="w-3 h-3" />
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => onRevoke(invitation.id)}
            className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition"
            title="Revoke"
          >
            <XCircle className="w-3 h-3" />
            Revoke
          </button>
        </div>
      )}
    </div>
  );
}

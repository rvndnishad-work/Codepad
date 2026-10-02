"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  hireMeUrl: string | null;
  portfolioPublic: boolean;
};

const inputCls =
  "w-full h-9 rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary";

export default function ProfileForm({ user }: { user: Profile }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: user.name ?? "",
    email: user.email ?? "",
    bio: user.bio ?? "",
    hireMeUrl: user.hireMeUrl ?? "",
    portfolioPublic: user.portfolioPublic,
  });
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string; field?: string } | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const body: Record<string, unknown> = {
        name: form.name,
        bio: form.bio,
        hireMeUrl: form.hireMeUrl,
        portfolioPublic: form.portfolioPublic,
      };
      // Email cannot be cleared, only changed.
      if (form.email.trim()) body.email = form.email;
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; field?: string };
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? "Could not save.", field: data.field });
        return;
      }
      setMsg({ ok: true, text: data.message ?? "Saved." });
      router.refresh();
    });
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs text-muted">Name</span>
          <input className={inputCls} value={form.name} maxLength={80} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Email</span>
          <input
            type="email"
            className={`${inputCls} ${msg?.field === "email" || msg?.text.includes("email") ? "border-danger" : ""}`}
            value={form.email}
            maxLength={254}
            onChange={(e) => set("email", e.target.value)}
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-muted">Bio</span>
        <textarea
          className={`${inputCls} h-20 py-2 resize-y`}
          value={form.bio}
          maxLength={2000}
          onChange={(e) => set("bio", e.target.value)}
        />
      </label>
      <label className="block">
        <span className="text-xs text-muted">Hire me link</span>
        <input className={inputCls} value={form.hireMeUrl} maxLength={500} onChange={(e) => set("hireMeUrl", e.target.value)} />
      </label>
      <label className="flex items-center gap-2 text-sm text-fg">
        <input
          type="checkbox"
          checked={form.portfolioPublic}
          onChange={(e) => set("portfolioPublic", e.target.checked)}
          className="accent-[rgb(var(--c-accent-2))]"
        />
        Public portfolio
      </label>
      <div className="flex items-center justify-end gap-3">
        {msg && (
          <p className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`} role={msg.ok ? "status" : "alert"}>
            {msg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-3.5 rounded-lg bg-secondary text-bg text-sm font-medium inline-flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50"
        >
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save profile
        </button>
      </div>
    </form>
  );
}

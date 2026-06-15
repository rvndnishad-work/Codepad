"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, FileText, Building2, Layers } from "lucide-react";

type Results = {
  questions: { title: string; slug: string; difficulty: string; technology: string | null; company: string | null }[];
  companies: { name: string; slug: string; logo: string | null }[];
  technologies: { slug: string; label: string }[];
};

const EMPTY: Results = { questions: [], companies: [], technologies: [] };
const TRENDING = ["React", "System Design", "Google", "Node.js", "DSA"];

/** Debounced instant-search box with a results dropdown. */
export default function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) {
      setRes(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/interview-questions/search?q=${encodeURIComponent(needle)}`);
        if (r.ok) setRes(await r.json());
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hasResults = res.questions.length + res.companies.length + res.technologies.length > 0;

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        {loading && <Loader2 className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-muted animate-spin" />}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search questions, companies, technologies…"
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-accent/50 shadow-sm"
        />
      </div>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-border bg-surface shadow-2xl overflow-hidden">
          {q.trim().length < 2 ? (
            <div className="p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Trending</div>
              <div className="flex flex-wrap gap-2">
                {TRENDING.map((t) => (
                  <button
                    key={t}
                    onClick={() => setQ(t)}
                    className="px-2.5 py-1 rounded-lg border border-border text-xs font-bold text-muted hover:text-accent hover:border-accent/40 transition"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ) : !hasResults && !loading ? (
            <div className="p-4 text-sm text-muted">No results for “{q}”.</div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto py-1.5">
              {res.companies.length > 0 && (
                <Section icon={<Building2 className="w-3.5 h-3.5" />} label="Companies">
                  {res.companies.map((c) => (
                    <Row key={c.slug} onClick={() => router.push(`/interview-questions/company/${c.slug}`)}>
                      {c.name}
                    </Row>
                  ))}
                </Section>
              )}
              {res.technologies.length > 0 && (
                <Section icon={<Layers className="w-3.5 h-3.5" />} label="Technologies">
                  {res.technologies.map((t) => (
                    <Row key={t.slug} onClick={() => router.push(`/interview-questions/${t.slug}`)}>
                      {t.label}
                    </Row>
                  ))}
                </Section>
              )}
              {res.questions.length > 0 && (
                <Section icon={<FileText className="w-3.5 h-3.5" />} label="Questions">
                  {res.questions.map((qq) => (
                    <Row key={qq.slug} onClick={() => router.push(`/interview-question/${qq.slug}`)}>
                      <span className="truncate">{qq.title}</span>
                      {qq.company && <span className="text-[10px] text-muted shrink-0 ml-2">{qq.company}</span>}
                    </Row>
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="px-1.5 pb-1.5">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-left hover:bg-bg transition"
    >
      {children}
    </button>
  );
}

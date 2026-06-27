"use client";

import { useEffect, useRef, useState, useMemo } from "react";
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

  const [activeIndex, setActiveIndex] = useState(-1);

  // Compute a flattened array of selectable results for keyboard navigation.
  const flatItems = useMemo(() => {
    const list: { type: "company" | "tech" | "question"; label: string; url: string }[] = [];
    res.companies.forEach((c) => {
      list.push({ type: "company", label: c.name, url: `/interview-questions/company/${c.slug}` });
    });
    res.technologies.forEach((t) => {
      list.push({ type: "tech", label: t.label, url: `/interview-questions/${t.slug}` });
    });
    res.questions.forEach((q) => {
      list.push({ type: "question", label: q.title, url: `/interview-question/${q.slug}` });
    });
    return list;
  }, [res]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [res]);

  const updateQuery = (val: string) => {
    setQ(val);
    if (val.trim().length < 2) {
      setRes(EMPTY);
      setLoading(false);
    } else {
      setLoading(true);
    }
  };

  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) {
      return;
    }
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || flatItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 >= flatItems.length ? 0 : prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 < 0 ? flatItems.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < flatItems.length) {
        e.preventDefault();
        const selected = flatItems[activeIndex];
        router.push(selected.url);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const hasResults = res.questions.length + res.companies.length + res.technologies.length > 0;

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        {loading && <Loader2 className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-muted animate-spin" />}
        <input
          value={q}
          onChange={(e) => updateQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
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
                    onClick={() => updateQuery(t)}
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
                  {res.companies.map((c, idx) => {
                    const flatIdx = idx;
                    return (
                      <Row
                        key={c.slug}
                        active={activeIndex === flatIdx}
                        onClick={() => {
                          router.push(`/interview-questions/company/${c.slug}`);
                          setOpen(false);
                        }}
                      >
                        {c.name}
                      </Row>
                    );
                  })}
                </Section>
              )}
              {res.technologies.length > 0 && (
                <Section icon={<Layers className="w-3.5 h-3.5" />} label="Technologies">
                  {res.technologies.map((t, idx) => {
                    const flatIdx = res.companies.length + idx;
                    return (
                      <Row
                        key={t.slug}
                        active={activeIndex === flatIdx}
                        onClick={() => {
                          router.push(`/interview-questions/${t.slug}`);
                          setOpen(false);
                        }}
                      >
                        {t.label}
                      </Row>
                    );
                  })}
                </Section>
              )}
              {res.questions.length > 0 && (
                <Section icon={<FileText className="w-3.5 h-3.5" />} label="Questions">
                  {res.questions.map((qq, idx) => {
                    const flatIdx = res.companies.length + res.technologies.length + idx;
                    return (
                      <Row
                        key={qq.slug}
                        active={activeIndex === flatIdx}
                        onClick={() => {
                          router.push(`/interview-question/${qq.slug}`);
                          setOpen(false);
                        }}
                      >
                        <span className="truncate">{qq.title}</span>
                        {qq.company && <span className="text-[10px] text-muted shrink-0 ml-2">{qq.company}</span>}
                      </Row>
                    );
                  })}
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

function Row({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-left transition ${
        active
          ? "bg-accent/10 text-accent font-bold shadow-sm"
          : "hover:bg-bg text-fg/90"
      }`}
    >
      {children}
    </button>
  );
}

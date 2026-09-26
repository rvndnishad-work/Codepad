"use client";

/**
 * The wizard's right sidebar: pickers (candidates, questions) and the
 * summary, with its own scroll so long lists never push the step away.
 * Collapses to a slim rail on desktop and becomes a drawer on small screens.
 */
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PanelRightClose, PanelRightOpen, X, type LucideIcon } from "lucide-react";
import { spring } from "./parts";

export type SideTab = { id: string; label: string; icon: LucideIcon; count?: number; body: ReactNode };

const OPEN_KEY = "interview-wizard:side-open";

export function useSideOpen(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(OPEN_KEY) === "0") setOpen(false);
    } catch {}
  }, []);
  const set = (v: boolean) => {
    setOpen(v);
    try {
      localStorage.setItem(OPEN_KEY, v ? "1" : "0");
    } catch {}
  };
  return [open, set];
}

export default function SidePanel({
  tabs,
  active,
  onActive,
  open,
  onOpen,
  drawer,
  onDrawer,
}: {
  tabs: SideTab[];
  active: string;
  onActive: (id: string) => void;
  /** Desktop: expanded or collapsed to the rail. */
  open: boolean;
  onOpen: (v: boolean) => void;
  /** Small screens: the drawer is showing. */
  drawer: boolean;
  onDrawer: (v: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const tab = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!tab) return null;

  const header = (onClose: () => void, closeIcon: ReactNode, closeLabel: string) => (
    <div className="flex items-center gap-1 px-2 h-12 border-b border-border shrink-0">
      <div role="tablist" aria-label="Sidebar" className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const on = t.id === tab.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onActive(t.id)}
              className={`relative shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[13px] font-medium transition-colors ${on ? "text-fg" : "text-muted hover:text-fg"}`}
            >
              {on && <motion.span layoutId="side-tab" transition={spring} className="absolute inset-0 rounded-lg bg-panel" />}
              <t.icon className="relative w-3.5 h-3.5" aria-hidden />
              <span className="relative">{t.label}</span>
              {t.count ? <span className="relative text-xs text-secondary-soft tabular-nums">{t.count}</span> : null}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onClose} aria-label={closeLabel} title={closeLabel} className="w-8 h-8 rounded-lg text-muted hover:text-fg hover:bg-panel flex items-center justify-center shrink-0">
        {closeIcon}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop: a column that collapses to a rail */}
      <motion.aside
        aria-label="Sidebar"
        initial={false}
        animate={{ width: open ? 380 : 52 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 38 }}
        className="hidden lg:flex flex-col sticky top-0 self-start h-[calc(100dvh-60px-68px-4rem)] min-h-[420px] rounded-2xl border border-border bg-surface overflow-hidden shrink-0"
      >
        {open ? (
          <>
            {header(() => onOpen(false), <PanelRightClose className="w-4 h-4" />, "Collapse the sidebar")}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={tab.id} initial={reduce ? false : { opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.16 }}>
                  {tab.body}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 py-2">
            <button type="button" onClick={() => onOpen(true)} aria-label="Expand the sidebar" title="Expand the sidebar" className="w-9 h-9 rounded-lg text-muted hover:text-fg hover:bg-panel flex items-center justify-center">
              <PanelRightOpen className="w-4 h-4" />
            </button>
            <span aria-hidden className="w-6 h-px bg-border my-1" />
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onActive(t.id);
                  onOpen(true);
                }}
                aria-label={t.label}
                title={t.label}
                className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${t.id === tab.id ? "bg-panel text-fg" : "text-muted hover:text-fg hover:bg-panel"}`}
              >
                <t.icon className="w-4 h-4" />
                {t.count ? <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-secondary text-bg text-[10px] font-semibold leading-4 tabular-nums">{t.count}</span> : null}
              </button>
            ))}
          </div>
        )}
      </motion.aside>

      {/* Small screens: a drawer from the right */}
      <AnimatePresence>
        {drawer && (
          <div className="lg:hidden fixed inset-0 z-[60]">
            <motion.button
              type="button"
              aria-label="Close"
              onClick={() => onDrawer(false)}
              className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              role="dialog"
              aria-label={tab.label}
              initial={reduce ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className="absolute right-0 top-0 bottom-0 w-[min(420px,92vw)] flex flex-col bg-surface border-l border-border shadow-2xl"
            >
              {header(() => onDrawer(false), <X className="w-4 h-4" />, "Close the sidebar")}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">{tab.body}</div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

import Link from "next/link";
import { getAllSwitches, SWITCHES } from "@/lib/admin/switches";
import { shortDay } from "@/lib/admin/stats/developer-helpers";
import SwitchControl from "./SwitchControl";

const STATE_WORD = { on: "On", read_only: "Read only", off: "Off" } as const;

const shortDate = shortDay;

function shortDateTime(d: Date): string {
  return `${shortDate(d)}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`;
}

/** The Controls rail: every developer-side switch, then the whole-side link. */
export default async function ControlsRail() {
  const values = await getAllSwitches();
  const defs = SWITCHES.filter((s) => s.side === "developer");

  return (
    <aside aria-label="Controls" className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <h2 className="flex-1 text-[15px] font-semibold text-fg">Controls</h2>
        <Link href="/admin/switches" className="text-sm text-secondary hover:underline">
          All switches
        </Link>
      </div>
      <p className="mt-1 mb-2 text-xs text-muted">
        Read only means pages open but nothing new runs or saves. Every change asks for a note and goes to the audit log.
      </p>

      <div>
        {defs.map((def) => {
          const v = values.find((x) => x.key === def.key);
          const state = v?.state ?? "on";
          let detail: string = def.description;
          if (state !== "on") {
            const parts = [`${STATE_WORD[state]}${v?.updatedAt ? ` since ${shortDate(v.updatedAt)}` : ""}`];
            if (v?.resumeAt) parts.push(`back on ${shortDateTime(v.resumeAt)}`);
            if (v?.updatedNote) parts.push(v.updatedNote);
            detail = parts.join(", ");
          }
          return (
            <SwitchControl
              key={def.key}
              switchKey={def.key}
              label={def.label}
              detail={detail}
              state={state}
              message={v?.message || def.defaultMessage}
              resumeAt={v?.resumeAt ? v.resumeAt.toISOString() : null}
            />
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-fg">Whole developer side</div>
          <div className="text-xs text-muted">Maintenance for every prep page. Marketing pages stay up.</div>
        </div>
        <Link
          href="/admin/maintenance?area=dev"
          className="inline-flex items-center h-8 px-3 rounded-lg border border-border bg-surface text-xs font-medium text-fg hover:bg-panel"
        >
          Schedule
        </Link>
      </div>
    </aside>
  );
}

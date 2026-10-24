"use client";

/**
 * Credits by workspace (Billing, Usage and credits): every workspace on the
 * billing account with its own balance, the account's unassigned credits,
 * moving credits between them, and the monthly split of plan credits.
 * Rules: src/lib/billing/credit-split.ts.
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Btn } from "../candidates/_components/ui";
import { plural } from "@/lib/workspace/display";
import { UNASSIGNED } from "@/lib/billing/credit-split";
import { moveCreditsAction, setCreditSplitAction } from "./actions";

export type SplitData = {
  currentId: string;
  workspaces: { id: string; name: string; slug: string; balance: number; available: number; share: number | null; monthly: number }[];
  unassigned: number;
  unassignedMonthly: number;
  creditsPerMonth: number;
  splitSet: boolean;
  canSplit: boolean;
  canBuyFor: string[];
};

type Notify = (text: string, tone?: "ok" | "error") => void;

const field =
  "h-9 rounded-lg border border-border bg-bg px-2.5 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 disabled:opacity-60";

export default function WorkspaceCredits({ slug, data, notify }: { slug: string; data: SplitData; notify: Notify }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const places = useMemo(
    () => [
      ...data.workspaces.map((w) => ({ id: w.id, label: w.id === data.currentId ? `${w.name} (this workspace)` : w.name, free: w.available })),
      { id: UNASSIGNED, label: "Unassigned", free: Math.max(0, data.unassigned) },
    ],
    [data],
  );
  const firstOther = data.workspaces.find((w) => w.id !== data.currentId)?.id ?? UNASSIGNED;
  const [from, setFrom] = useState<string>(data.unassigned > 0 ? UNASSIGNED : data.currentId);
  const [to, setTo] = useState<string>(data.unassigned > 0 ? data.currentId : firstOther);
  const [amount, setAmount] = useState("");
  const [shares, setShares] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.workspaces.map((w) => [w.id, data.splitSet ? String(w.share ?? 0) : String(w.monthly)])),
  );
  const fromFree = places.find((p) => p.id === from)?.free ?? 0;
  const splitSum = Object.values(shares).reduce((n, v) => n + (Number(v) || 0), 0);
  const splitLeft = data.creditsPerMonth - splitSum;

  const move = () =>
    start(async () => {
      const res = await moveCreditsAction(slug, from, to, Number(amount));
      if (!res.ok) return notify(res.error, "error");
      notify(res.message);
      setAmount("");
      router.refresh();
    });
  const saveSplit = () =>
    start(async () => {
      const res = await setCreditSplitAction(slug, shares);
      if (!res.ok) return notify(res.error, "error");
      notify(res.message);
      router.refresh();
    });

  return (
    <section className="rounded-xl border border-border bg-surface" aria-labelledby="ws-credits-title">
      <div className="px-5 py-4 md:px-6 border-b border-border flex flex-col gap-0.5">
        <h2 id="ws-credits-title" className="text-base font-semibold text-fg">
          Credits by workspace
        </h2>
        <p className="text-[13px] text-muted">
          Each workspace spends only its own credits. Move credits where they are needed. When a workspace is deleted, what it has left comes back
          here as unassigned.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border">
              <th scope="col" className="font-medium px-5 md:px-6 py-2.5">Workspace</th>
              <th scope="col" className="font-medium px-3 py-2.5 text-right">Credits</th>
              <th scope="col" className="font-medium px-3 py-2.5 text-right">Free to use</th>
              <th scope="col" className="font-medium px-5 md:px-6 py-2.5 text-right">Plan credits a month</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.workspaces.map((w) => (
              <tr key={w.id} className={w.id === data.currentId ? "bg-secondary/[0.05]" : undefined}>
                <th scope="row" className="text-left font-medium text-fg px-5 md:px-6 py-3">
                  {w.name}
                  {w.id === data.currentId && <span className="ml-2 text-xs font-normal text-muted">this workspace</span>}
                </th>
                <td className="px-3 py-3 text-right tabular-nums text-fg">{w.balance.toLocaleString("en-GB")}</td>
                <td className="px-3 py-3 text-right tabular-nums text-muted">{w.available.toLocaleString("en-GB")}</td>
                <td className="px-5 md:px-6 py-3 text-right tabular-nums text-muted">{data.creditsPerMonth ? w.monthly.toLocaleString("en-GB") : "None"}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="text-left font-medium text-fg px-5 md:px-6 py-3">
                Unassigned
                <span className="ml-2 text-xs font-normal text-muted">not in any workspace yet</span>
              </th>
              <td className="px-3 py-3 text-right tabular-nums text-fg">{data.unassigned.toLocaleString("en-GB")}</td>
              <td className="px-3 py-3 text-right tabular-nums text-muted">{Math.max(0, data.unassigned).toLocaleString("en-GB")}</td>
              <td className="px-5 md:px-6 py-3 text-right tabular-nums text-muted">{data.creditsPerMonth ? data.unassignedMonthly.toLocaleString("en-GB") : "None"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {!data.canSplit ? (
        <p className="px-5 md:px-6 py-4 border-t border-border text-[13px] text-muted">
          The account owner, or someone with billing access in every workspace on this plan, can move credits and set the monthly split.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 border-t border-border">
          <form
            className="px-5 md:px-6 py-5 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              move();
            }}
          >
            <h3 className="text-sm font-semibold text-fg">Move credits</h3>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-muted min-w-0">
                From
                <select className={field} value={from} onChange={(e) => setFrom(e.target.value)} disabled={pending}>
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.free})
                    </option>
                  ))}
                </select>
              </label>
              <ArrowRight className="hidden sm:block w-4 h-4 text-subtle mb-2.5" aria-hidden />
              <label className="flex flex-col gap-1 text-xs text-muted min-w-0">
                To
                <select className={field} value={to} onChange={(e) => setTo(e.target.value)} disabled={pending}>
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Credits
                <input
                  className={`${field} w-24 tabular-nums`}
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder={String(fromFree)}
                  disabled={pending}
                />
              </label>
              <Btn type="submit" variant="primary" size="md" className="h-9" disabled={pending || !amount || from === to}>
                Move
              </Btn>
            </div>
            <p className="text-xs text-subtle">
              {plural(fromFree, "credit")} free to move from there. Credits held by open screening invites stay put. Plan credits keep their
              expiry date when moved.
            </p>
          </form>

          {data.creditsPerMonth > 0 && (
            <form
              className="px-5 md:px-6 py-5 flex flex-col gap-3 border-t lg:border-t-0 lg:border-l border-border"
              onSubmit={(e) => {
                e.preventDefault();
                saveSplit();
              }}
            >
              <h3 className="text-sm font-semibold text-fg">Monthly split</h3>
              <p className="text-xs text-muted -mt-1.5">
                Your plan adds {plural(data.creditsPerMonth, "credit")} each month.{" "}
                {data.splitSet ? "Anything you do not split stays unassigned." : "Until you set a split, they all go to your oldest workspace."}
              </p>
              <ul className="flex flex-col gap-2">
                {data.workspaces.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-3">
                    <label htmlFor={`share-${w.id}`} className="text-sm text-fg truncate">
                      {w.name}
                    </label>
                    <input
                      id={`share-${w.id}`}
                      className={`${field} w-24 text-right tabular-nums`}
                      inputMode="numeric"
                      value={shares[w.id] ?? ""}
                      onChange={(e) => setShares((s) => ({ ...s, [w.id]: e.target.value.replace(/[^0-9]/g, "") }))}
                      disabled={pending}
                    />
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-3">
                <span className={`text-xs tabular-nums ${splitLeft < 0 ? "text-danger" : "text-muted"}`}>
                  {splitLeft < 0 ? `${-splitLeft} more than your plan has` : `${splitLeft} left unassigned each month`}
                </span>
                <Btn type="submit" variant="ghost" size="md" className="h-9" disabled={pending || splitLeft < 0}>
                  Save split
                </Btn>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

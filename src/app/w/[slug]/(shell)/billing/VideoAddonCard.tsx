"use client";

/**
 * Billing, Plan tab: the "Built-in video" add-on card. Owners and admins with
 * billing access switch it on and off; everyone else sees it read-only.
 */
import Link from "next/link";
import { Video } from "lucide-react";
import { useState, useTransition } from "react";
import { setVideoAddonAction } from "./actions";
import { videoAddonCents } from "@/lib/video/addon";

export type VideoAddonData = {
  /** Growth, Enterprise or an active trial. */
  available: boolean;
  onTrial: boolean;
  /** The stored switch. Shown as on only while the plan allows it. */
  on: boolean;
  onSince: string | null;
  /** A Stripe subscription item carries the charge. */
  billed: boolean;
  callsThisMonth: number;
  /** How the subscription bills: annual plans pay $180 a year. */
  interval: "month" | "year";
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function VideoAddonCard({
  slug,
  data,
  canManage,
  chooseGrowth,
  notify,
}: {
  slug: string;
  data: VideoAddonData;
  canManage: boolean;
  /** Opens the Growth checkout; null when this viewer cannot start one. */
  chooseGrowth: (() => void) | null;
  notify: (text: string, tone?: "ok" | "error") => void;
}) {
  const [on, setOn] = useState(data.on && data.available);
  const [onSince, setOnSince] = useState(data.onSince);
  const [pending, start] = useTransition();

  function flip(next: boolean) {
    const before = on;
    setOn(next);
    start(async () => {
      const res = await setVideoAddonAction(slug, next);
      if (!res.ok) {
        setOn(before);
        notify(res.error, "error");
        return;
      }
      setOn(res.on);
      if (res.on && !before) setOnSince(new Date().toISOString());
      notify(res.on ? "Built-in video is on." : "Built-in video is off.");
    });
  }

  // "28 Sep". Built by hand: some ICU builds print "Sept" for en-GB.
  const sinceDate = onSince ? new Date(onSince) : null;
  const since = sinceDate ? `${sinceDate.getUTCDate()} ${MONTHS[sinceDate.getUTCMonth()]}` : null;
  const editable = canManage && data.available && !pending;

  let footer: React.ReactNode;
  if (!data.available) {
    footer = (
      <>
        Not available on Free.{" "}
        {chooseGrowth ? (
          <button type="button" onClick={chooseGrowth} className="text-secondary-soft hover:underline">
            Choose Growth
          </button>
        ) : (
          <Link href="/pricing" className="text-secondary-soft hover:underline">
            See Growth
          </Link>
        )}{" "}
        to use it.
      </>
    );
  } else if (!canManage) {
    footer = on ? "Ask an owner or admin to switch it off." : "Ask an owner or admin to switch it on.";
  } else if (data.onTrial) {
    footer = on
      ? "On trial: free until your trial ends. Choose a plan to keep it."
      : "Free during your trial. Choose a plan to keep it after.";
  } else if (on) {
    footer = "Switch it off any time. Stripe credits the days it is off.";
  } else {
    footer = "Added to your next invoice, charged for the days it is on. Switch it off any time.";
  }

  const yearly = data.interval === "year";
  const amount = `$${videoAddonCents(data.interval) / 100}`;
  const per = yearly ? "a year" : "a month";
  const nextCharge = data.onTrial ? "Free during your trial" : amount;

  return (
    <section
      aria-labelledby="video-addon-title"
      className={`rounded-2xl border bg-surface p-6 flex flex-col gap-3.5 ${on ? "border-success/35" : "border-border"}`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`w-10 h-10 shrink-0 rounded-xl inline-flex items-center justify-center ${
            on ? "bg-success/15 text-success" : "bg-secondary/15 text-secondary-soft"
          }`}
        >
          <Video className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 id="video-addon-title" className="text-base font-semibold text-fg">
            Built-in video
          </h3>
          <p className={`text-[13px] ${on ? "text-success" : "text-muted"}`}>
            {on ? (since ? `On since ${since} · ${amount} ${per}` : `On · ${amount} ${per}`) : `${amount} ${per} for the workspace`}
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-[13px] text-muted">
          <span>{on ? "On" : "Off"}</span>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Built-in video"
            disabled={!editable}
            onClick={() => flip(!on)}
            className={`relative inline-flex h-[22px] w-10 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 disabled:cursor-not-allowed ${
              on ? "bg-success" : "bg-border-strong"
            } ${!editable && !pending ? "opacity-60" : ""}`}
          >
            <span
              aria-hidden
              className={`inline-block h-4 w-4 rounded-full shadow transition-transform motion-reduce:transition-none ${
                on ? "translate-x-[21px] bg-bg" : "translate-x-[3px] bg-fg"
              }`}
            />
          </button>
        </label>
      </div>

      {on ? (
        <>
          <p className="text-sm leading-relaxed text-muted">
            New interviews use built-in video. Hosts can still pick a meeting link for one interview.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border px-3 py-3">
              <div className="text-xs text-muted">Calls this month</div>
              <div className="text-[22px] font-semibold tabular-nums text-fg">{data.callsThisMonth}</div>
            </div>
            <div className="rounded-xl border border-border px-3 py-3">
              <div className="text-xs text-muted">Next charge</div>
              <div className={`font-semibold text-fg ${data.onTrial ? "text-base pt-1.5" : "text-[22px] tabular-nums"}`}>{nextCharge}</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-muted">
            Interviewers and candidates talk on camera inside the interview room, next to the code. No Zoom or Teams, nothing to
            install.
          </p>
          <ul className="list-disc pl-[18px] text-sm leading-[1.8] text-muted">
            <li>Camera and mic check in the lobby</li>
            <li>Screen sharing</li>
            <li>Every live interview, every seat</li>
          </ul>
        </>
      )}

      <p className="text-[13px] text-muted">{footer}</p>
    </section>
  );
}

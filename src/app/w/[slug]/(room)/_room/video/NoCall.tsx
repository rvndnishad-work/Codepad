"use client";

/**
 * The room without built-in video: the quiet add-on chip next to Join call
 * (billing managers only), the "No call set up" card for interviewers, the
 * calm note for candidates, and the "not set up yet" note when the add-on is
 * on but the server has no video settings. Candidates never see offers.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, MessageCircle, VideoOff } from "lucide-react";
import type { RoomVideo } from "@/lib/video/room-video";
import { VIDEO_ADDON_PRICE } from "@/lib/video/addon";
import { meetingProvider } from "@/lib/interview/meeting";
import { saveMeetingLink } from "./api";

const PRICE = `$${VIDEO_ADDON_PRICE.monthlyCents / 100}`;

/** "Built-in video" chip beside Join call, with a short explanation. */
export function VideoOfferChip({ video, meetingUrl }: { video: RoomVideo; meetingUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  if (!video.canOffer) return null;
  const tool = meetingProvider(meetingUrl) ?? "your meeting tool";
  return (
    <div ref={box} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="h-8 px-3 rounded-lg border border-dashed border-secondary/40 text-secondary-soft text-[13px] font-medium inline-flex items-center hover:bg-secondary/10 whitespace-nowrap"
      >
        Built-in video
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Built-in video"
          className="absolute right-0 top-full mt-2 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border-strong bg-surface p-5 shadow-2xl shadow-black/40 flex flex-col gap-3"
        >
          <p className="text-[16px] font-semibold">Talk here instead of {tool}</p>
          <p className="text-[14px] leading-relaxed text-muted">
            {video.offerUpgrade
              ? `With built-in video, you and the candidate see each other next to the code, with nothing to install. It comes with the Growth plan, for ${PRICE} a month for the whole workspace.`
              : `With built-in video, you and the candidate see each other next to the code, with nothing to install. It is ${PRICE} a month for the whole workspace, and you can switch it off any time.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={video.billingHref} className="h-8 px-3 rounded-lg bg-secondary text-bg text-[13px] font-semibold inline-flex items-center hover:brightness-110">
              {video.offerUpgrade ? "See plans in Billing" : "Switch it on in Billing"}
            </Link>
            <button type="button" onClick={() => setOpen(false)} className="h-8 px-3 rounded-lg border border-border text-[13px] font-medium hover:bg-panel">
              Not now
            </button>
          </div>
          <p className="text-[12px] text-muted">Only people who manage billing see this.</p>
        </div>
      )}
    </div>
  );
}

/** Top bar note for interviewers: the add-on is on but the server has no video settings. */
export function VideoNotSetUpChip() {
  return (
    <span
      title="Built-in video is on, but the server is missing its video settings. Use a meeting link for now, or ask whoever runs Interviewpad for your team to finish the setup."
      className="hidden md:inline-flex h-8 px-2.5 rounded-lg ring-1 ring-inset ring-border text-muted text-[13px] items-center gap-1.5 whitespace-nowrap"
    >
      <VideoOff className="w-3.5 h-3.5" aria-hidden /> Video is not set up yet
    </span>
  );
}

/** Interviewers, before the start, when there is no way to talk yet. */
export function NoCallCard({ id, video, candidateName }: { id: string; video: RoomVideo; candidateName: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const notSetUp = !video.configured;
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await saveMeetingLink(id, value);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save the link.");
    } finally {
      setBusy(false);
    }
  };
  const first = candidateName.split(/\s+/)[0] || candidateName;
  return (
    <section className="w-full max-w-xl rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3.5 text-left">
      <div className="flex gap-3 items-start">
        <span className="w-9 h-9 rounded-[10px] bg-warning/10 text-warning inline-flex items-center justify-center shrink-0">
          <CircleAlert className="w-[18px] h-[18px]" aria-hidden />
        </span>
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="text-[15px] font-semibold">{notSetUp ? "Video is not set up yet" : "No call set up for this interview"}</h3>
          <p className="text-[14px] leading-relaxed text-muted">
            {notSetUp
              ? `Built-in video is on, but the server is missing its video settings. Paste a Zoom, Meet or Teams link for now so ${first} sees a Join call button.`
              : `The room shares code and drawings, not voice. Paste a Zoom, Meet or Teams link so ${first} sees a Join call button${video.canOffer ? ", or talk right here with built-in video" : ""}.`}
          </p>
        </div>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <input
          type="url"
          inputMode="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://meet.google.com/..."
          aria-label="Meeting link"
          className="flex-1 min-w-0 h-9 rounded-lg border border-border bg-bg text-fg px-3 text-[14px] placeholder:text-subtle focus:outline-none focus:border-secondary/60"
        />
        <button type="submit" disabled={busy || !value.trim()} className="h-9 px-3 rounded-lg border border-border bg-surface text-[13px] font-medium hover:bg-panel disabled:opacity-50 shrink-0">
          {busy ? "Saving" : "Save link"}
        </button>
      </form>
      {err && (
        <p role="alert" className="text-[12.5px] text-danger -mt-1.5">
          {err}
        </p>
      )}
      {video.canOffer && (
        <div className="flex items-center gap-2.5 pt-3 border-t border-border">
          <span className="flex-1 text-[13px] text-muted">
            {video.offerUpgrade ? `Built-in video comes with the Growth plan, ${PRICE} a month for the workspace.` : `Built-in video: ${PRICE} a month for the workspace.`}
          </span>
          <Link href={video.billingHref} className="h-8 px-3 rounded-lg border border-secondary/40 text-secondary-soft text-[13px] font-medium inline-flex items-center hover:bg-secondary/10 shrink-0">
            See in Billing
          </Link>
        </div>
      )}
    </section>
  );
}

/** Candidates, before the start, when there is no call link. */
export function NoCallNote() {
  return (
    <p className="inline-flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-[14px] text-muted text-left">
      <MessageCircle className="w-4 h-4 shrink-0 text-subtle" aria-hidden />
      Your interviewer will tell you how you will talk, by phone or a call link.
    </p>
  );
}

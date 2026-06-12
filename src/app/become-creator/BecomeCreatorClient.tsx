"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Store,
  Sparkles,
  BookOpen,
  Code2,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  Youtube,
  Linkedin,
  ArrowRight,
  Users,
  Link2,
  BadgeCheck,
  Rocket,
} from "lucide-react";
import { submitCreatorApplicationAction } from "./actions";
import { CREATOR_FOLLOWER_MINIMUM } from "./constants";

type Application = {
  platform: string;
  profileUrl: string;
  followerCount: number;
  status: string;
  reviewNote: string | null;
} | null;

const PERKS = [
  { icon: Store, title: "Your own space", body: "A branded hub at /c/your-handle — your content, your audience, your brand." },
  { icon: BookOpen, title: "Publish anything", body: "Tutorials, interview Q&A, blogs, playgrounds, and coding challenges." },
  { icon: DollarSign, title: "Get paid", body: "Sell one-time or through monthly membership tiers — we handle the payments." },
  { icon: Code2, title: "Interactive lessons", body: "Embed runnable playgrounds and challenges right inside your content." },
];

const STEPS = [
  { icon: Link2, title: "Apply with your profile", body: "Share your YouTube or LinkedIn profile and your audience size." },
  { icon: BadgeCheck, title: "We verify you", body: "Our team reviews every application — you'll hear back quickly." },
  { icon: Rocket, title: "Launch your space", body: "Set up your hub, publish your first content, and start earning." },
];

export default function BecomeCreatorClient({ application }: { application: Application }) {
  const pending = application?.status === "PENDING";
  const rejected = application?.status === "REJECTED";

  return (
    <div className="relative overflow-hidden">
      {/* Ambient glow + dot grid behind the hero */}
      <div className="absolute inset-x-0 top-0 h-[520px] bg-hero-glow pointer-events-none" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 h-[520px] pointer-events-none [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(var(--accent-rgb),0.10) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />

      <div className="relative max-w-5xl mx-auto px-4 pt-14 pb-20">
        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-glow px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-accent animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" /> Creator program
          </div>
          <h1 className="mt-6 text-4xl md:text-6xl font-black tracking-tight text-fg leading-[1.05] animate-slide-up">
            Teach what you know.
            <br />
            <span className="text-accent">Get paid for it.</span>
          </h1>
          <p className="mt-5 text-base md:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            Launch your own creator space on Interviewpad — publish tutorials, interview prep,
            challenges and playgrounds, and earn through memberships and one-time sales.
          </p>
          {!pending && (
            <a
              href="#apply"
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg font-bold shadow-soft transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              Apply now <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Perks */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PERKS.map((p) => (
            <div
              key={p.title}
              className="group relative rounded-2xl border border-border bg-surface p-5 shadow-tile transition-all duration-200 hover:border-accent/30 hover:shadow-tile-hover hover:-translate-y-1"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-glow border border-accent/20 grid place-items-center text-accent transition-transform duration-200 group-hover:scale-110">
                <p.icon className="w-5 h-5" />
              </div>
              <div className="mt-3.5 text-sm font-bold text-fg">{p.title}</div>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>

        {/* How it works + application */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* Steps */}
          <div>
            <h2 className="text-2xl font-black tracking-tight text-fg">How it works</h2>
            <p className="text-sm text-muted mt-1.5">From application to your first sale in three steps.</p>
            <ol className="mt-8">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative flex gap-4 pb-8 last:pb-0">
                  {i < STEPS.length - 1 && (
                    <span className="absolute left-[19px] top-11 bottom-1 w-px bg-gradient-to-b from-accent/40 to-border" aria-hidden />
                  )}
                  <div className="relative w-10 h-10 shrink-0 rounded-xl bg-surface border border-accent/25 grid place-items-center text-accent shadow-tile">
                    <s.icon className="w-[18px] h-[18px]" />
                  </div>
                  <div className="pt-1">
                    <div className="text-sm font-bold text-fg">
                      <span className="text-accent mr-1.5 font-mono">0{i + 1}</span>
                      {s.title}
                    </div>
                    <p className="text-xs text-muted mt-1 leading-relaxed">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            {/* Eligibility */}
            <div className="mt-8 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-fg">Eligibility</div>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  We currently onboard established creators: you need at least{" "}
                  <span className="font-bold text-fg">{CREATOR_FOLLOWER_MINIMUM.toLocaleString()}+</span>{" "}
                  subscribers on YouTube or followers on LinkedIn. Share your profile and our
                  team will verify and approve your access.
                </p>
              </div>
            </div>
          </div>

          {/* Application card */}
          <div
            id="apply"
            className="relative scroll-mt-24 rounded-3xl border border-border bg-surface p-6 md:p-7 shadow-tile overflow-hidden"
          >
            <div className="absolute top-[-30%] right-[-25%] w-[70%] h-[70%] bg-accent opacity-[0.06] blur-[90px] pointer-events-none" aria-hidden />
            <div className="relative">
              {pending ? (
                <StatusBanner
                  icon={Clock}
                  tone="text-amber-500 border-amber-500/25 bg-amber-500/10"
                  title="Application under review"
                  body="Thanks! Our team is verifying your profile. You'll be notified when it's approved."
                />
              ) : (
                <>
                  <h2 className="text-xl font-black tracking-tight text-fg">Request creator access</h2>
                  <p className="text-xs text-muted mt-1.5 mb-6">
                    Takes less than a minute — we&apos;ll review and get back to you.
                  </p>
                  {rejected && (
                    <div className="mb-5">
                      <StatusBanner
                        icon={XCircle}
                        tone="text-rose-500 border-rose-500/25 bg-rose-500/10"
                        title="Not approved yet"
                        body={application?.reviewNote || "Your last application wasn't approved. You can update your details and resubmit."}
                      />
                    </div>
                  )}
                  <ApplicationForm initial={application} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBanner({ icon: Icon, tone, title, body }: { icon: typeof Clock; tone: string; title: string; body: string }) {
  return (
    <div className={`rounded-2xl border p-4 flex gap-3.5 ${tone}`}>
      <div className="w-9 h-9 rounded-xl bg-bg/40 grid place-items-center shrink-0">
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div>
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs opacity-90 mt-0.5 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-fg text-sm transition-colors placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15";

const labelCls = "block text-[10px] font-bold uppercase tracking-[0.14em] text-muted mb-1.5";

function ApplicationForm({ initial }: { initial: Application }) {
  const router = useRouter();
  const [platform, setPlatform] = useState<"youtube" | "linkedin">(
    (initial?.platform as "youtube" | "linkedin") || "youtube",
  );
  const [profileUrl, setProfileUrl] = useState(initial?.profileUrl ?? "");
  const [followers, setFollowers] = useState(initial?.followerCount ? String(initial.followerCount) : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const followerCount = parseInt(followers, 10);
    if (!profileUrl.trim() || !Number.isFinite(followerCount)) {
      toast.error("Add your profile link and follower count.");
      return;
    }
    if (followerCount < CREATOR_FOLLOWER_MINIMUM) {
      toast.error(`You need at least ${CREATOR_FOLLOWER_MINIMUM.toLocaleString()} followers/subscribers.`);
      return;
    }
    setBusy(true);
    try {
      await submitCreatorApplicationAction({ platform, profileUrl, followerCount, note: note || undefined });
      toast.success("Application submitted! We'll review it shortly.");
      router.refresh();
    } catch (err) {
      toast.error("Couldn't submit", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <span className={labelCls}>Platform</span>
        <div className="grid grid-cols-2 gap-2.5">
          {(["youtube", "linkedin"] as const).map((p) => {
            const Icon = p === "youtube" ? Youtube : Linkedin;
            const active = platform === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`relative inline-flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-sm font-bold capitalize transition-all ${
                  active
                    ? "border-accent/50 bg-accent-glow text-fg shadow-tile"
                    : "border-border bg-bg/60 text-muted hover:text-fg hover:border-border-strong"
                }`}
              >
                <Icon className={`w-[18px] h-[18px] ${p === "youtube" ? "text-red-500" : "text-sky-500"}`} />
                {p}
                {active && <CheckCircle2 className="w-3.5 h-3.5 text-accent absolute top-1.5 right-1.5" />}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className={labelCls}>Profile link</span>
        <input
          value={profileUrl}
          onChange={(e) => setProfileUrl(e.target.value)}
          placeholder={platform === "youtube" ? "https://youtube.com/@yourchannel" : "https://linkedin.com/in/you"}
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className={labelCls}>Followers / subscribers</span>
        <div className="relative">
          <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            value={followers}
            onChange={(e) => setFollowers(e.target.value)}
            inputMode="numeric"
            placeholder={`${CREATOR_FOLLOWER_MINIMUM.toLocaleString()} or more`}
            className={`${inputCls} pl-10`}
          />
        </div>
      </label>

      <label className="block">
        <span className={labelCls}>
          Anything else? <span className="normal-case tracking-normal font-medium opacity-70">(optional)</span>
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Links to your best content, what you'd like to publish…"
          className={`${inputCls} resize-none`}
        />
      </label>

      <button
        onClick={submit}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg text-sm font-bold shadow-soft transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
      >
        {busy ? "Submitting…" : initial ? "Resubmit application" : "Request creator access"}
        {!busy && <ArrowRight className="w-4 h-4" />}
      </button>
      <p className="text-[10px] text-muted/70 text-center">We manually verify every profile before approval.</p>
    </div>
  );
}

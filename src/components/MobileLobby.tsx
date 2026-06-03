import QRCode from "qrcode";
import { Monitor, Smartphone, ShieldCheck, Clock } from "lucide-react";
import MobileLobbyActions from "./MobileLobbyActions";

/**
 * Mobile-handoff lobby (IP-38). Rendered server-side when a candidate hits a
 * code-running route (take-home / interview / ai-interview) from a phone.
 *
 * Renders:
 *   - Branded hero explaining why we redirect to desktop
 *   - QR code (SVG, server-rendered, no client JS to display it)
 *   - Action row (client island): Copy link · Email me · Continue anyway
 *   - Reassurance copy: the token is preserved across devices
 *
 * The QR encodes the full original URL (including any token / query string)
 * so scanning on a laptop drops the candidate straight into the right page —
 * no manual re-entry, no token rotation.
 */

type Props = {
  /** The full URL the candidate originally landed on, including query string. */
  url: string;
  /** Headline above the QR — e.g. "Open your take-home on desktop". */
  title: string;
  /** Optional subline below the title, plain text. */
  subtitle?: string;
  /** What kind of token are we preserving — used in the reassurance copy. */
  tokenLabel?: "take-home" | "interview" | "ai-interview";
  /**
   * Whether to expose the "Email me this link" action. Pass false when the
   * email service isn't configured so the UI stays honest.
   */
  emailEnabled?: boolean;
};

const TOKEN_LABELS: Record<NonNullable<Props["tokenLabel"]>, string> = {
  "take-home": "take-home assignment",
  interview: "interview session",
  "ai-interview": "AI interview",
};

export default async function MobileLobby({
  url,
  title,
  subtitle,
  tokenLabel = "interview",
  emailEnabled = true,
}: Props) {
  // Server-render the QR as an SVG string so it's part of the HTML payload —
  // no client roundtrip, works with JS disabled.
  let qrSvg = "";
  try {
    qrSvg = await QRCode.toString(url, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      color: { dark: "#0b0f19", light: "#ffffff" },
      width: 240,
    });
  } catch {
    qrSvg = "";
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F3F4F6] flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Soft background orbs to match the take-home / interview lobbies */}
      <div className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full bg-amber-400/[0.06] blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full bg-indigo-500/[0.08] blur-[120px] pointer-events-none" />

      <main className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand + intro */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-semibold uppercase tracking-[0.18em]">
            <Smartphone className="w-3 h-3" />
            Mobile device detected
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[#94a3b8] leading-relaxed">{subtitle}</p>
          )}
        </header>

        {/* QR card */}
        <section className="rounded-2xl border border-[#1f2738] bg-[#0F1422] p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">
            <Monitor className="w-3.5 h-3.5" />
            Scan with a laptop or desktop
          </div>

          {/* QR — server-rendered SVG. Constrained to 240px so layout stays
              steady on narrow screens. */}
          {qrSvg ? (
            <div
              className="mx-auto w-[240px] h-[240px] rounded-xl bg-white p-3 grid place-items-center"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : (
            <div className="mx-auto w-[240px] h-[240px] rounded-xl bg-white/5 border border-dashed border-[#1f2738] grid place-items-center text-[11px] text-[#94a3b8] text-center px-4">
              QR couldn't render — use the buttons below to copy the link.
            </div>
          )}

          <p className="text-[11px] text-[#94a3b8] text-center leading-relaxed">
            Or use the buttons below to forward this link to yourself.
          </p>
        </section>

        {/* Action row — client island */}
        <MobileLobbyActions url={url} emailEnabled={emailEnabled} />

        {/* Reassurance copy */}
        <section className="rounded-xl border border-[#1f2738] bg-[#0F1422]/60 p-4 space-y-2.5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-[#94a3b8] leading-relaxed">
              <span className="text-[#F3F4F6] font-semibold">Your {TOKEN_LABELS[tokenLabel]} link is preserved.</span>{" "}
              Opening it on desktop drops you straight into the editor — no re-entry,
              no token rotation.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-[#94a3b8] leading-relaxed">
              The clock starts when you open the editor, not now. Take your time
              switching devices.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

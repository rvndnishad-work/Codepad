/**
 * Workspace branding on candidate pages: the logo (or an initial and the
 * name) at the top, and the help contact and privacy notice at the bottom.
 * Both render on the server and on the client.
 */
import type { CandidateBrand } from "@/lib/workspace/candidate-experience";

export function CandidateBrandMark({ brand, size = "md" }: { brand: CandidateBrand; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-7" : "h-9";
  return (
    <span className="flex items-center gap-2.5 min-w-0">
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logoUrl} alt={brand.name} className={`${h} w-auto max-w-[180px] object-contain`} />
      ) : (
        <>
          <span
            aria-hidden
            className={`${size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm"} rounded-lg bg-elevated border border-border-strong flex items-center justify-center font-semibold text-fg shrink-0`}
          >
            {brand.name.trim().charAt(0).toUpperCase() || "W"}
          </span>
          <span className="text-sm font-semibold text-fg truncate">{brand.name}</span>
        </>
      )}
    </span>
  );
}

/** Help and privacy line for the bottom of a candidate page. Renders nothing when neither is set. */
export function CandidateHelpLine({ brand, className = "" }: { brand: CandidateBrand; className?: string }) {
  if (!brand.helpEmail && !brand.privacyNoticeUrl) return null;
  return (
    <p className={`text-xs text-muted text-center leading-relaxed ${className}`}>
      {brand.helpEmail && (
        <>
          Need help? Write to{" "}
          <a href={`mailto:${brand.helpEmail}`} className="text-fg underline underline-offset-2 hover:no-underline">
            {brand.helpEmail}
          </a>
          .
        </>
      )}
      {brand.helpEmail && brand.privacyNoticeUrl && " "}
      {brand.privacyNoticeUrl && (
        <a href={brand.privacyNoticeUrl} target="_blank" rel="noopener noreferrer" className="text-fg underline underline-offset-2 hover:no-underline">
          {brand.name} privacy notice
        </a>
      )}
    </p>
  );
}

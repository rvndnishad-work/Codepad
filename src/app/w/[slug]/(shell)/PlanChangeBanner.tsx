import Link from "next/link";

/**
 * Shown above every workspace page during the move to the new plans: while
 * paused, and during the notice period for a workspace that will pause.
 */
export default function PlanChangeBanner({ slug, kind, date }: { slug: string; kind: "paused" | "ending"; date: string | null }) {
  return (
    <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-fg">
      <span>
        {kind === "paused"
          ? "This workspace is paused until you choose a plan. Your candidates and results are all here, but new take-homes, interviews and AI screenings are off."
          : `The Free plan ends on ${date}. Choose a plan before then to keep sending take-homes and interviews.`}
      </span>
      <Link href={`/w/${slug}/billing`} className="font-medium text-secondary-soft hover:underline">
        Choose a plan
      </Link>
    </div>
  );
}

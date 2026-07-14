import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";

/** Breadcrumb back to the space, with its identity — shared by content viewers. */
export default function SpaceCrumb({
  handle,
  name,
  avatarUrl,
}: {
  handle: string;
  name: string;
  avatarUrl: string | null;
}) {
  return (
    <Link
      href={`/c/${handle}`}
      className="group inline-flex items-center gap-2.5 text-xs font-semibold text-muted hover:text-fg transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="w-6 h-6 rounded-lg border border-border object-cover" />
      ) : (
        <span className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 grid place-items-center text-accent">
          <Store className="w-3.5 h-3.5" />
        </span>
      )}
      <span className="text-fg group-hover:text-accent transition-colors">{name}</span>
    </Link>
  );
}

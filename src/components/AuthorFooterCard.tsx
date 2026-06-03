import Link from "next/link";
import SafeImage from "./SafeImage";
import { User as UserIcon } from "lucide-react";
import FollowButton from "./FollowButton";
import RelativeTime from "./RelativeTime";

export type AuthorFooterPost = {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
};

/**
 * "More from this author" footer card that appears below the article content.
 * Mirrors the byline at the top but with bio + recent posts surfaced as a
 * lightweight reading-list cue.
 */
export default function AuthorFooterCard({
  user,
  morePosts,
  isFollowing,
  signedIn,
  viewerIsAuthor,
}: {
  user: {
    id: string;
    name: string | null;
    image: string | null;
    bio: string | null;
  };
  morePosts: AuthorFooterPost[];
  isFollowing: boolean;
  signedIn: boolean;
  viewerIsAuthor: boolean;
}) {
  return (
    <section className="mt-20 mb-12 rounded-3xl border border-border bg-surface p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start gap-5">
        <Link
          href={`/u/${user.id}`}
          className="relative w-16 h-16 rounded-full bg-surface overflow-hidden border border-border shrink-0"
        >
          {user.image ? (
            <SafeImage
              src={user.image}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
              unoptimized={user.image.startsWith("data:")}
            />
          ) : (
            <div className="w-full h-full bg-accent/10 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-muted" />
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted mb-1">
                Written by
              </div>
              <Link
                href={`/u/${user.id}`}
                className="text-xl font-black text-fg tracking-tight hover:text-accent transition-colors truncate block"
              >
                {user.name ?? "Anonymous"}
              </Link>
            </div>
            {!viewerIsAuthor && (
              <FollowButton
                userId={user.id}
                initialFollowing={isFollowing}
                signedIn={signedIn}
              />
            )}
          </div>
          {user.bio && (
            <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-3">
              {user.bio}
            </p>
          )}

          {morePosts.length > 0 && (
            <div className="mt-5 pt-5 border-t border-border">
              <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-muted mb-3">
                More from {user.name ?? "this author"}
              </h4>
              <ul className="flex flex-col gap-2">
                {morePosts.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="flex items-center justify-between gap-4 py-1.5 group"
                    >
                      <span className="text-sm font-bold text-fg/80 group-hover:text-accent transition-colors line-clamp-1">
                        {p.title}
                      </span>
                      <span className="text-[11px] text-muted/60 shrink-0 whitespace-nowrap">
                        <RelativeTime iso={p.createdAt} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

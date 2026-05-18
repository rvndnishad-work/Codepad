"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Sparkles, 
  FileText, 
  Target, 
  Clock, 
  Eye, 
  Heart, 
  MessageSquare, 
  Star, 
  Pin,
  ArrowRight,
  TrendingUp,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { 
  toggleBlogPostFeatured, 
  toggleChallengeFeatured, 
  toggleSnippetPinned 
} from "./actions";

// Types corresponding to the queried database nodes
interface UserContext {
  name: string | null;
  email: string | null;
  image: string | null;
}

interface SnippetData {
  id: string;
  title: string;
  template: string;
  viewCount: number;
  pinned: boolean;
  createdAt: Date;
  user: UserContext | null;
}

interface BlogData {
  id: string;
  title: string;
  status: string;
  viewCount: number;
  featured: boolean;
  createdAt: Date;
  user: { name: string | null; email: string | null };
  _count: { reactions: number; comments: number };
}

interface ChallengeData {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  category: string | null;
  featured: boolean;
  createdAt: Date;
  _count: { attempts: number };
}

interface AttemptData {
  id: string;
  startedAt: Date;
  status: string;
  challenge: { title: string; difficulty: string; slug: string };
  user: UserContext;
}

interface DashboardFeedHubProps {
  initialSnippets: SnippetData[];
  initialBlogs: BlogData[];
  initialChallenges: ChallengeData[];
  initialAttempts: AttemptData[];
}

type TabType = "snippets" | "blogs" | "challenges" | "solutions";

export default function DashboardFeedHub({
  initialSnippets,
  initialBlogs,
  initialChallenges,
  initialAttempts
}: DashboardFeedHubProps) {
  const [activeTab, setActiveTab] = useState<TabType>("snippets");
  const [snippetSort, setSnippetSort] = useState<"recent" | "views">("recent");
  const [blogSort, setBlogSort] = useState<"recent" | "views">("recent");
  const [challengeSort, setChallengeSort] = useState<"recent" | "attempts">("recent");
  const [attemptFilter, setAttemptFilter] = useState<"all" | "passed" | "failed">("all");

  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Client-side sorting/filtering routines based on selected state toggles
  const getSortedSnippets = () => {
    return [...initialSnippets].sort((a, b) => {
      if (snippetSort === "views") return b.viewCount - a.viewCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const getSortedBlogs = () => {
    return [...initialBlogs].sort((a, b) => {
      if (blogSort === "views") return b.viewCount - a.viewCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const getSortedChallenges = () => {
    return [...initialChallenges].sort((a, b) => {
      if (challengeSort === "attempts") return b._count.attempts - a._count.attempts;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const getFilteredAttempts = () => {
    return initialAttempts.filter(attempt => {
      if (attemptFilter === "passed") return attempt.status === "passed";
      if (attemptFilter === "failed") return attempt.status === "failed";
      return true;
    });
  };

  // Safe action trigger wrappers
  const handleToggleBlogFeatured = (id: string) => {
    setLoadingId(id);
    startTransition(async () => {
      try {
        await toggleBlogPostFeatured(id);
      } catch (err) {
        console.error("Failed to toggle blog featured:", err);
      } finally {
        setLoadingId(null);
      }
    });
  };

  const handleToggleChallengeFeatured = (id: string) => {
    setLoadingId(id);
    startTransition(async () => {
      try {
        await toggleChallengeFeatured(id);
      } catch (err) {
        console.error("Failed to toggle challenge featured:", err);
      } finally {
        setLoadingId(null);
      }
    });
  };

  const handleToggleSnippetPinned = (id: string) => {
    setLoadingId(id);
    startTransition(async () => {
      try {
        await toggleSnippetPinned(id);
      } catch (err) {
        console.error("Failed to toggle snippet pinned:", err);
      } finally {
        setLoadingId(null);
      }
    });
  };

  // Helper date formatter
  const formatRelativeTime = (dateInput: Date | string) => {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDays}d ago`;
  };

  const TABS = [
    { id: "snippets", label: "Snippets", icon: Sparkles, count: initialSnippets.length },
    { id: "blogs", label: "Blogs", icon: FileText, count: initialBlogs.length },
    { id: "challenges", label: "Challenges", icon: Target, count: initialChallenges.length },
    { id: "solutions", label: "Solutions Stream", icon: Clock, count: initialAttempts.length },
  ] as const;

  return (
    <div className="rounded-2xl border border-border bg-bg shadow-sm overflow-hidden">
      {/* Category Tab Bar Wrapper */}
      <div className="border-b border-border bg-panel/30 p-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                  isActive 
                    ? "bg-bg text-fg shadow-sm border border-border" 
                    : "text-muted hover:text-fg hover:bg-surface/50"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-accent" : ""}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-accent/15 text-accent" : "bg-muted/10 text-muted"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab-specific View Filters Control Strip */}
        <div className="flex items-center gap-2 pr-2">
          {activeTab === "snippets" && (
            <div className="flex items-center gap-1 bg-surface/60 border border-border rounded-xl p-1">
              <button
                onClick={() => setSnippetSort("recent")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                  snippetSort === "recent" ? "bg-bg text-fg shadow-sm border border-border" : "text-muted hover:text-fg"
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setSnippetSort("views")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                  snippetSort === "views" ? "bg-bg text-fg shadow-sm border border-border" : "text-muted hover:text-fg"
                }`}
              >
                Most Viewed
              </button>
            </div>
          )}

          {activeTab === "blogs" && (
            <div className="flex items-center gap-1 bg-surface/60 border border-border rounded-xl p-1">
              <button
                onClick={() => setBlogSort("recent")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                  blogSort === "recent" ? "bg-bg text-fg shadow-sm border border-border" : "text-muted hover:text-fg"
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setBlogSort("views")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                  blogSort === "views" ? "bg-bg text-fg shadow-sm border border-border" : "text-muted hover:text-fg"
                }`}
              >
                Most Viewed
              </button>
            </div>
          )}

          {activeTab === "challenges" && (
            <div className="flex items-center gap-1 bg-surface/60 border border-border rounded-xl p-1">
              <button
                onClick={() => setChallengeSort("recent")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                  challengeSort === "recent" ? "bg-bg text-fg shadow-sm border border-border" : "text-muted hover:text-fg"
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setChallengeSort("attempts")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                  challengeSort === "attempts" ? "bg-bg text-fg shadow-sm border border-border" : "text-muted hover:text-fg"
                }`}
              >
                Most Solved
              </button>
            </div>
          )}

          {activeTab === "solutions" && (
            <div className="flex items-center gap-1 bg-surface/60 border border-border rounded-xl p-1">
              <button
                onClick={() => setAttemptFilter("all")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                  attemptFilter === "all" ? "bg-bg text-fg shadow-sm border border-border" : "text-muted hover:text-fg"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setAttemptFilter("passed")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                  attemptFilter === "passed" ? "bg-bg text-fg shadow-sm border border-border" : "text-muted hover:text-fg"
                }`}
              >
                Passed
              </button>
              <button
                onClick={() => setAttemptFilter("failed")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                  attemptFilter === "failed" ? "bg-bg text-fg shadow-sm border border-border" : "text-muted hover:text-fg"
                }`}
              >
                Failed
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Feed Lists Container */}
      <div className="divide-y divide-border min-h-[350px] bg-bg flex flex-col justify-between">
        <div className="divide-y divide-border">
          
          {/* TAB 1: Shared Snippets Feed */}
          {activeTab === "snippets" && (
            getSortedSnippets().length === 0 ? (
              <div className="p-16 text-center text-xs text-muted">No shared snippets shared yet.</div>
            ) : (
              getSortedSnippets().map(snippet => (
                <div key={snippet.id} className="p-4 hover:bg-panel/30 transition flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted relative shrink-0">
                      {snippet.user?.image ? (
                        <Image src={snippet.user.image} alt="" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-muted">
                          {(snippet.user?.name || "?")[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-fg truncate">{snippet.title}</span>
                        {snippet.pinned && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[8px] font-black uppercase tracking-wider border border-accent/20">
                            <Pin className="w-2.5 h-2.5 rotate-[45deg]" />
                            Pinned
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted truncate mt-0.5">
                        Created by {snippet.user?.name || snippet.user?.email || "Anonymous"} • Template: <span className="font-mono text-[9px] font-black text-muted-strong uppercase">{snippet.template}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-mono font-bold text-muted flex items-center gap-1 bg-surface/50 border border-border px-2 py-0.5 rounded-full">
                      <Eye className="w-3.5 h-3.5" />
                      {snippet.viewCount} views
                    </span>
                    <span className="text-[10px] font-mono text-muted mr-1">{formatRelativeTime(snippet.createdAt)}</span>
                    <button
                      onClick={() => handleToggleSnippetPinned(snippet.id)}
                      disabled={loadingId === snippet.id}
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border transition ${
                        snippet.pinned 
                          ? "bg-accent/10 border-accent/30 text-accent hover:bg-accent/25" 
                          : "bg-surface border-border text-muted hover:text-fg hover:border-border-strong"
                      }`}
                      title={snippet.pinned ? "Unpin snippet" : "Pin snippet"}
                    >
                      {loadingId === snippet.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Pin className="w-3.5 h-3.5 rotate-[45deg]" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {/* TAB 2: Blog Posts Feed */}
          {activeTab === "blogs" && (
            getSortedBlogs().length === 0 ? (
              <div className="p-16 text-center text-xs text-muted">No blog posts found.</div>
            ) : (
              getSortedBlogs().map(post => (
                <div key={post.id} className="p-4 hover:bg-panel/30 transition flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-fg truncate">{post.title}</span>
                      {post.featured && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[8px] font-black uppercase tracking-wider border border-accent/20">
                          <Star className="w-2.5 h-2.5 fill-accent" />
                          Featured
                        </span>
                      )}
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        post.status === "PUBLISHED" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                        post.status === "PENDING" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                        "bg-muted/10 border-border text-muted"
                      }`}>
                        {post.status.toLowerCase()}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted truncate mt-0.5">
                      By {post.user.name || post.user.email} • {formatRelativeTime(post.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 bg-surface/50 border border-border px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-muted">
                      <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {post.viewCount}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {post._count.reactions}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" /> {post._count.comments}</span>
                    </div>

                    <button
                      onClick={() => handleToggleBlogFeatured(post.id)}
                      disabled={loadingId === post.id}
                      className={`inline-flex items-center justify-center px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition ${
                        post.featured 
                          ? "bg-accent/15 border-accent/30 text-accent hover:bg-accent/25" 
                          : "bg-surface border-border text-muted hover:text-fg hover:border-border-strong"
                      }`}
                    >
                      {loadingId === post.id ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Star className={`w-3 h-3 mr-1 ${post.featured ? "fill-accent" : ""}`} />
                      )}
                      {post.featured ? "Featured" : "Feature"}
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {/* TAB 3: Challenges Feed */}
          {activeTab === "challenges" && (
            getSortedChallenges().length === 0 ? (
              <div className="p-16 text-center text-xs text-muted">No challenges created yet.</div>
            ) : (
              getSortedChallenges().map(challenge => (
                <div key={challenge.id} className="p-4 hover:bg-panel/30 transition flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-fg truncate">{challenge.title}</span>
                      {challenge.featured && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[8px] font-black uppercase tracking-wider border border-accent/20">
                          <Star className="w-2.5 h-2.5 fill-accent" />
                          Featured
                        </span>
                      )}
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        challenge.difficulty === "easy" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        challenge.difficulty === "medium" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                        "bg-red-500/10 text-red-500 border-red-500/20"
                      }`}>
                        {challenge.difficulty}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted truncate mt-0.5">
                      Category: {challenge.category || "General"} • Created {formatRelativeTime(challenge.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-mono font-bold text-muted flex items-center gap-1 bg-surface/50 border border-border px-2.5 py-0.5 rounded-full">
                      <TrendingUp className="w-3.5 h-3.5 text-accent" />
                      {challenge._count.attempts} attempts
                    </span>

                    <button
                      onClick={() => handleToggleChallengeFeatured(challenge.id)}
                      disabled={loadingId === challenge.id}
                      className={`inline-flex items-center justify-center px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition ${
                        challenge.featured 
                          ? "bg-accent/15 border-accent/30 text-accent hover:bg-accent/25" 
                          : "bg-surface border-border text-muted hover:text-fg hover:border-border-strong"
                      }`}
                    >
                      {loadingId === challenge.id ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Star className={`w-3 h-3 mr-1 ${challenge.featured ? "fill-accent" : ""}`} />
                      )}
                      {challenge.featured ? "Featured" : "Feature"}
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {/* TAB 4: Solutions Feed */}
          {activeTab === "solutions" && (
            getFilteredAttempts().length === 0 ? (
              <div className="p-16 text-center text-xs text-muted">No solution attempts match this filter.</div>
            ) : (
              getFilteredAttempts().map(attempt => (
                <div key={attempt.id} className="p-4 hover:bg-panel/30 transition flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted relative shrink-0">
                      {attempt.user.image ? (
                        <Image src={attempt.user.image} alt="" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-muted">
                          {(attempt.user.name || "?")[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-fg truncate">
                        {attempt.user.name || attempt.user.email}
                      </div>
                      <div className="text-[10px] text-muted truncate mt-0.5">
                        attempted <Link href={`/admin/challenges?q=${attempt.challenge.slug}`} className="text-muted-strong hover:text-accent font-semibold">{attempt.challenge.title}</Link>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      attempt.challenge.difficulty === "easy" ? "bg-emerald-500/10 text-emerald-500" :
                      attempt.challenge.difficulty === "medium" ? "bg-amber-500/10 text-amber-500" :
                      "bg-red-500/10 text-red-500"
                    }`}>
                      {attempt.challenge.difficulty}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      attempt.status === "passed" ? "bg-emerald-500/20 text-emerald-400" :
                      attempt.status === "failed" ? "bg-red-500/20 text-red-400" :
                      "bg-muted/30 text-muted"
                    }`}>
                      {attempt.status === "passed" ? (
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      ) : attempt.status === "failed" ? (
                        <XCircle className="w-2.5 h-2.5" />
                      ) : (
                        <AlertCircle className="w-2.5 h-2.5" />
                      )}
                      {attempt.status}
                    </span>
                    <span className="text-[10px] font-mono text-muted">{formatRelativeTime(attempt.startedAt)}</span>
                  </div>
                </div>
              ))
            )
          )}

        </div>

        {/* Global Catalog Footer Details */}
        <div className="bg-panel/20 p-3 border-t border-border flex items-center justify-between text-xs text-muted font-medium">
          <span>Displaying top entries from index logs.</span>
          {activeTab === "blogs" && (
            <Link href="/admin/blogs" className="font-bold text-accent hover:underline inline-flex items-center gap-1">
              Moderation Workspace <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
          {activeTab === "challenges" && (
            <Link href="/admin/challenges" className="font-bold text-accent hover:underline inline-flex items-center gap-1">
              Challenges Catalog <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
          {activeTab === "snippets" && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-strong">
              Shared Playgrounds Logs
            </span>
          )}
          {activeTab === "solutions" && (
            <Link href="/admin/attempts" className="font-bold text-accent hover:underline inline-flex items-center gap-1">
              Historical Solution Stream <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

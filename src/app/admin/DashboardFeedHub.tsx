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
    <div className="rounded-2xl border border-border bg-gradient-to-b from-panel/40 via-panel/25 to-panel/15 backdrop-blur-md shadow-lg overflow-hidden">
      {/* Category Tab Bar Wrapper */}
      <div className="border-b border-border bg-panel/40 p-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 border ${
                  isActive 
                    ? "bg-elevated text-fg border-border shadow-[0_0_15px_rgba(0,0,0,0.15)]" 
                    : "border-transparent text-muted hover:text-fg hover:bg-panel/20"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? "text-accent" : ""}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                  isActive ? "bg-accent/15 text-accent border border-accent/20" : "bg-muted/10 text-muted"
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
            <div className="flex items-center gap-1 bg-panel/20 border border-border rounded-xl p-1">
              <button
                onClick={() => setSnippetSort("recent")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition border ${
                  snippetSort === "recent" ? "bg-elevated text-fg border-border-strong shadow-sm" : "border-transparent text-muted hover:text-fg hover:bg-panel/20"
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setSnippetSort("views")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition border ${
                  snippetSort === "views" ? "bg-elevated text-fg border-border-strong shadow-sm" : "border-transparent text-muted hover:text-fg hover:bg-panel/20"
                }`}
              >
                Most Viewed
              </button>
            </div>
          )}

          {activeTab === "blogs" && (
            <div className="flex items-center gap-1 bg-panel/20 border border-border rounded-xl p-1">
              <button
                onClick={() => setBlogSort("recent")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition border ${
                  blogSort === "recent" ? "bg-elevated text-fg border-border-strong shadow-sm" : "border-transparent text-muted hover:text-fg hover:bg-panel/20"
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setBlogSort("views")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition border ${
                  blogSort === "views" ? "bg-elevated text-fg border-border-strong shadow-sm" : "border-transparent text-muted hover:text-fg hover:bg-panel/20"
                }`}
              >
                Most Viewed
              </button>
            </div>
          )}

          {activeTab === "challenges" && (
            <div className="flex items-center gap-1 bg-panel/20 border border-border rounded-xl p-1">
              <button
                onClick={() => setChallengeSort("recent")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition border ${
                  challengeSort === "recent" ? "bg-elevated text-fg border-border-strong shadow-sm" : "border-transparent text-muted hover:text-fg hover:bg-panel/20"
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setChallengeSort("attempts")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition border ${
                  challengeSort === "attempts" ? "bg-elevated text-fg border-border-strong shadow-sm" : "border-transparent text-muted hover:text-fg hover:bg-panel/20"
                }`}
              >
                Most Solved
              </button>
            </div>
          )}

          {activeTab === "solutions" && (
            <div className="flex items-center gap-1 bg-panel/20 border border-border rounded-xl p-1">
              <button
                onClick={() => setAttemptFilter("all")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition border ${
                  attemptFilter === "all" ? "bg-elevated text-fg border-border-strong shadow-sm" : "border-transparent text-muted hover:text-fg hover:bg-panel/20"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setAttemptFilter("passed")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition border ${
                  attemptFilter === "passed" ? "bg-elevated text-fg border-border-strong shadow-sm" : "border-transparent text-muted hover:text-fg hover:bg-panel/20"
                }`}
              >
                Passed
              </button>
              <button
                onClick={() => setAttemptFilter("failed")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition border ${
                  attemptFilter === "failed" ? "bg-elevated text-fg border-border-strong shadow-sm" : "border-transparent text-muted hover:text-fg hover:bg-panel/20"
                }`}
              >
                Failed
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab Feed Lists Container */}
      <div className="divide-y divide-border min-h-[350px] bg-transparent flex flex-col justify-between">
        <div className="divide-y divide-border">
          
          {/* TAB 1: Shared Snippets Feed */}
          {activeTab === "snippets" && (
            getSortedSnippets().length === 0 ? (
              <div className="p-16 text-center text-xs text-muted">No shared snippets shared yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
                {getSortedSnippets().map(snippet => (
                  <div key={snippet.id} className="rounded-xl border border-accent/15 bg-gradient-to-br from-accent/[0.04] via-panel/20 to-panel/10 p-4 hover:border-accent/40 hover:bg-panel/30 transition-all duration-300 flex flex-col justify-between gap-4 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-accent/[0.04] rounded-full blur-2xl group-hover:scale-110 pointer-events-none" />
                    
                    {/* Top Header Row */}
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-bg border border-border relative shrink-0">
                          {snippet.user?.image ? (
                            <Image src={snippet.user.image} alt="" fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-muted">
                              {(snippet.user?.name || "?")[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-fg truncate">
                            {snippet.user?.name || "Anonymous"}
                          </div>
                          <div className="text-[9px] text-muted truncate">
                            {snippet.user?.email || "No email"}
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-muted shrink-0 bg-bg border border-border px-1.5 py-0.5 rounded-full">
                        {formatRelativeTime(snippet.createdAt)}
                      </span>
                    </div>

                    {/* Title & Template Badge */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-fg group-hover:text-accent transition line-clamp-1">{snippet.title}</span>
                        {snippet.pinned && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-accent/10 text-accent text-[8px] font-black uppercase tracking-wider border border-accent/20 shrink-0">
                            <Pin className="w-2.5 h-2.5 rotate-[45deg]" />
                            Pinned
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono font-black text-muted uppercase tracking-wider bg-bg px-2 py-0.5 rounded border border-border">
                          {snippet.template}
                        </span>
                      </div>
                    </div>

                    {/* Footer Metrics & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-[9px] font-mono font-bold text-muted flex items-center gap-1 bg-bg border border-border px-2 py-0.5 rounded-full">
                        <Eye className="w-3 h-3" />
                        {snippet.viewCount} views
                      </span>

                      <button
                        onClick={() => handleToggleSnippetPinned(snippet.id)}
                        disabled={loadingId === snippet.id}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border transition ${
                          snippet.pinned 
                            ? "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20" 
                            : "bg-bg border border-border-strong text-muted hover:text-fg hover:border-accent/40"
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
                ))}
              </div>
            )
          )}

          {/* TAB 2: Blog Posts Feed */}
          {activeTab === "blogs" && (
            getSortedBlogs().length === 0 ? (
              <div className="p-16 text-center text-xs text-muted">No blog posts found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
                {getSortedBlogs().map(post => (
                  <div key={post.id} className="rounded-xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.04] via-panel/20 to-panel/10 p-4 hover:border-violet-500/40 hover:bg-panel/30 transition-all duration-300 flex flex-col justify-between gap-4 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/[0.04] rounded-full blur-2xl group-hover:scale-110 pointer-events-none" />
                    
                    {/* Top Header: Author & Time */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold text-muted truncate">
                        By {post.user.name || post.user.email}
                      </span>
                      <span className="text-[9px] font-mono text-muted bg-bg border border-border px-1.5 py-0.5 rounded-full shrink-0">
                        {formatRelativeTime(post.createdAt)}
                      </span>
                    </div>

                    {/* Title & Badges */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-fg group-hover:text-violet-400 transition line-clamp-2">{post.title}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1.5">
                        {post.featured && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[8px] font-black uppercase tracking-wider border border-accent/20">
                            <Star className="w-2.5 h-2.5 fill-accent" />
                            Featured
                          </span>
                        )}
                        <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          post.status === "PUBLISHED" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                          post.status === "PENDING" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                          "bg-muted/10 border-border text-muted"
                        }`}>
                          {post.status.toLowerCase()}
                        </span>
                      </div>
                    </div>

                    {/* Footer Metrics & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border gap-2">
                      <div className="flex items-center gap-1.5 bg-bg border border-border px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-muted">
                        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {post.viewCount}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {post._count.reactions}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" /> {post._count.comments}</span>
                      </div>

                      <button
                        onClick={() => handleToggleBlogFeatured(post.id)}
                        disabled={loadingId === post.id}
                        className={`inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition ${
                          post.featured 
                            ? "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20" 
                            : "bg-bg border border-border-strong text-muted hover:text-fg hover:border-accent/40"
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
                ))}
              </div>
            )
          )}

          {/* TAB 3: Challenges Feed */}
          {activeTab === "challenges" && (
            getSortedChallenges().length === 0 ? (
              <div className="p-16 text-center text-xs text-muted">No challenges created yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
                {getSortedChallenges().map(challenge => (
                  <div key={challenge.id} className="rounded-xl border border-accent/15 bg-gradient-to-br from-accent/[0.04] via-panel/20 to-panel/10 p-4 hover:border-accent/40 hover:bg-panel/30 transition-all duration-300 flex flex-col justify-between gap-4 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-accent/[0.04] rounded-full blur-2xl group-hover:scale-110 pointer-events-none" />
                    
                    {/* Top Header: Category & Difficulty */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-bg border border-border text-muted">
                        {challenge.category || "General"}
                      </span>
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        challenge.difficulty === "easy" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        challenge.difficulty === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>
                        {challenge.difficulty}
                      </span>
                    </div>

                    {/* Challenge Title */}
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-fg group-hover:text-accent transition line-clamp-2">{challenge.title}</span>
                      <div className="text-[9px] text-muted">
                        Created {formatRelativeTime(challenge.createdAt)}
                      </div>
                    </div>

                    {/* Footer Metrics & Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-[9px] font-mono font-bold text-muted flex items-center gap-1 bg-bg border border-border px-2 py-0.5 rounded-full">
                        <TrendingUp className="w-3 h-3 text-accent" />
                        {challenge._count.attempts} attempts
                      </span>

                      <div className="flex items-center gap-2">
                        {challenge.featured && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[8px] font-black uppercase tracking-wider border border-accent/20 shrink-0">
                            <Star className="w-2 h-2 fill-accent" />
                            Featured
                          </span>
                        )}
                        <button
                          onClick={() => handleToggleChallengeFeatured(challenge.id)}
                          disabled={loadingId === challenge.id}
                          className={`inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition ${
                            challenge.featured 
                              ? "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20" 
                              : "bg-bg border border-border-strong text-muted hover:text-fg hover:border-accent/40"
                          }`}
                        >
                          {loadingId === challenge.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Star className={`w-3 h-3 ${challenge.featured ? "fill-accent" : ""}`} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB 4: Solutions Feed */}
          {activeTab === "solutions" && (
            getFilteredAttempts().length === 0 ? (
              <div className="p-16 text-center text-xs text-muted">No solution attempts match this filter.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
                {getFilteredAttempts().map(attempt => (
                  <div key={attempt.id} className="rounded-xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.04] via-panel/20 to-panel/10 p-4 hover:border-emerald-500/40 hover:bg-panel/30 transition-all duration-300 flex flex-col justify-between gap-4 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.04] rounded-full blur-2xl group-hover:scale-110 pointer-events-none" />
                    
                    {/* Top User Info Row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-bg border border-border relative shrink-0">
                          {attempt.user.image ? (
                            <Image src={attempt.user.image} alt="" fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-muted">
                              {(attempt.user.name || "?")[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-fg truncate">
                            {attempt.user.name || "Developer"}
                          </div>
                          <div className="text-[9px] text-muted truncate">
                            {attempt.user.email}
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-muted shrink-0 bg-bg border border-border px-1.5 py-0.5 rounded-full">
                        {formatRelativeTime(attempt.startedAt)}
                      </span>
                    </div>

                    {/* Attempt Details */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-muted">
                        Attempted challenge:
                      </div>
                      <Link 
                        href={`/admin/challenges?q=${attempt.challenge.slug}`} 
                        className="text-xs font-bold text-fg hover:text-accent transition line-clamp-1 block"
                      >
                        {attempt.challenge.title}
                      </Link>
                    </div>

                    {/* Bottom badges */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        attempt.challenge.difficulty === "easy" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        attempt.challenge.difficulty === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>
                        {attempt.challenge.difficulty}
                      </span>

                      <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        attempt.status === "passed" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" :
                        attempt.status === "failed" ? "bg-red-500/10 border-red-500/25 text-red-400" :
                        "bg-panel/40 border border-border text-muted"
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
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Global Catalog Footer Details */}
        <div className="bg-panel/40 backdrop-blur-md p-4 border-t border-border flex items-center justify-between text-xs text-muted font-medium">
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

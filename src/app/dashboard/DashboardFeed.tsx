"use client";

import { useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { TemplateLogo } from "@/lib/icons";
import { Users, Flame, ArrowUpRight, Clock, Eye } from "lucide-react";
import RelativeTime from "@/components/RelativeTime";

type FeedItem = {
  id: string;
  slug: string;
  title: string;
  template: string;
  updatedAt: string;
  viewCount: number;
  userName: string | null;
  userImage: string | null;
};

export default function DashboardFeed({
  following,
  trending,
}: {
  following: FeedItem[];
  trending: FeedItem[];
}) {
  const [activeTab, setActiveTab] = useState<"following" | "trending">("trending");
  const currentItems = activeTab === "following" ? following : trending;

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex bg-surface border border-border p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("trending")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "trending"
                ? "bg-accent text-bg shadow-lg"
                : "text-muted hover:text-fg"
            }`}
          >
            <Flame className="w-4 h-4" />
            Trending
          </button>
          <button
            onClick={() => setActiveTab("following")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "following"
                ? "bg-accent text-bg shadow-lg"
                : "text-muted hover:text-fg"
            }`}
          >
            <Users className="w-4 h-4" />
            Following
          </button>
        </div>
        
        <Link href="/explore" className="text-xs text-accent hover:underline font-medium">
          View all explore
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentItems.length === 0 ? (
          <div className="col-span-full py-12 text-center rounded-3xl border border-dashed border-border text-muted">
            {activeTab === "following"
              ? "You aren't following anyone yet or they haven't posted recently."
              : "No trending snippets found."}
          </div>
        ) : (
          currentItems.map((item) => (
            <Link
              key={item.id}
              href={`/play/${item.slug}`}
              className="group rounded-2xl border border-border bg-panel p-4 hover:border-accent/40 transition-all flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-surface border border-border grid place-items-center transition-transform group-hover:scale-110">
                  <TemplateLogo id={item.template} size={20} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {item.viewCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <RelativeTime iso={item.updatedAt} />
                  </span>
                </div>
              </div>

              <h4 className="text-fg font-medium mb-1 group-hover:text-accent transition-colors line-clamp-1">
                {item.title}
              </h4>
              
              <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border/30">
                <div className="relative w-5 h-5 rounded-full bg-surface overflow-hidden">
                  {item.userImage ? (
                    <SafeImage
                      src={item.userImage}
                      alt=""
                      fill
                      sizes="20px"
                      className="object-cover"
                      unoptimized={item.userImage.startsWith("data:")}
                    />
                  ) : (
                    <div className="w-full h-full bg-accent/20 flex items-center justify-center text-[10px]">
                      {item.userName?.[0] ?? "?"}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted truncate flex-1">{item.userName ?? "Anonymous"}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

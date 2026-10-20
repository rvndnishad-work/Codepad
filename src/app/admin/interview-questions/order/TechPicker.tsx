"use client";

import { useRouter } from "next/navigation";

const select = "px-3 py-2 rounded-lg border border-border bg-bg text-xs font-bold focus:outline-none focus:border-accent/50 cursor-pointer";

export default function TechPicker({ tech, options }: { tech: string; options: { slug: string; label: string; count: number }[] }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-muted">
      Technology
      <select className={select} value={tech} onChange={(e) => router.push(`/admin/interview-questions/order?tech=${e.target.value}`)}>
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.label} ({o.count})
          </option>
        ))}
      </select>
    </label>
  );
}

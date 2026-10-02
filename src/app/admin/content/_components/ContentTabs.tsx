import UnderlineTabs from "@/app/w/[slug]/(shell)/_components/UnderlineTabs";

export type ContentTab = "questions" | "challenges" | "blogs" | "trends";

const TABS = [
  { id: "questions", label: "Questions", href: "/admin/interview-questions" },
  { id: "challenges", label: "Challenges", href: "/admin/challenges" },
  { id: "blogs", label: "Blogs", href: "/admin/blogs" },
  { id: "trends", label: "Trends", href: "/admin/snippets" },
];

/** The shared header for the four content pages: one title, one tab bar. */
export default function ContentTabs({ active }: { active: ContentTab }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Content</h1>
        <p className="text-sm text-muted mt-1">Questions, challenges, blogs and public snippets.</p>
      </div>
      <UnderlineTabs tabs={TABS} active={active} label="Content sections" />
    </div>
  );
}

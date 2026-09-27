import { getSettingsPageContext } from "@/lib/workspace/settings-server";
import SettingsTabs from "./_components/SettingsTabs";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

/**
 * Shared frame for every Settings tab: title, subtitle, tab bar, and a note
 * for members who can only look. Each tab is its own route under here.
 */
export default async function SettingsLayout({ children, params }: Props) {
  const { slug } = await params;
  const ctx = await getSettingsPageContext(slug);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">Settings</h1>
        <p className="text-sm text-muted">
          How this workspace looks, what new screenings start with, and who can get in. Owners and admins can change these.
        </p>
      </div>
      {!ctx.canEdit && (
        <div role="status" className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          You can see these settings but not change them. Ask an owner or admin if something needs to change.
        </div>
      )}
      <SettingsTabs slug={slug} />
      {children}
    </div>
  );
}

import {
  getNavLinks,
  getInterviewArenaSettings,
  getPlaygroundAssistSettings,
} from "@/lib/settings";
import SettingsForm, { type SettingsTab } from "./SettingsForm";
import UnderlineTabs from "@/app/w/[slug]/(shell)/_components/UnderlineTabs";
import { requireAdminAccess } from "@/lib/permissions/staff";

export const metadata = {
  title: "Settings — Admin",
};

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "nav", label: "Navigation" },
  { id: "arena", label: "Interview arena" },
  { id: "aiassist", label: "Playground AI assist" },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdminAccess();
  const { tab } = await searchParams;
  const active: SettingsTab = TABS.some((t) => t.id === tab) ? (tab as SettingsTab) : "nav";

  const [links, arenaSettings, assistSettings] = await Promise.all([
    getNavLinks(),
    getInterviewArenaSettings(),
    getPlaygroundAssistSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-fg">Site settings</h2>
        <p className="text-sm text-muted mt-1">
          Navigation gating and per-surface options. Every save is recorded in the audit log.
        </p>
      </div>

      <UnderlineTabs
        label="Settings sections"
        active={active}
        scroll={false}
        tabs={TABS.map((t) => ({ ...t, href: `/admin/settings?tab=${t.id}` }))}
      />

      <SettingsForm
        key={active}
        tab={active}
        initialLinks={links}
        initialArenaSettings={arenaSettings}
        initialAssistSettings={assistSettings}
      />
    </div>
  );
}

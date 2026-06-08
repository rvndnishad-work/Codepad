import {
  getNavLinks,
  getB2bSettings,
  getInterviewArenaSettings,
  getMaintenanceSettings,
} from "@/lib/settings";
import SettingsForm from "./SettingsForm";

export const metadata = {
  title: "Settings — Admin",
};

export default async function SettingsPage() {
  const [links, b2bSettings, arenaSettings, maintenance] = await Promise.all([
    getNavLinks(),
    getB2bSettings(),
    getInterviewArenaSettings(),
    getMaintenanceSettings(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight">Site Settings</h2>
        <p className="text-sm text-muted mt-1">Configure global application behavior.</p>
      </div>

      <SettingsForm
        initialLinks={links}
        initialB2bSettings={b2bSettings}
        initialArenaSettings={arenaSettings}
        initialMaintenance={maintenance}
      />
    </div>
  );
}



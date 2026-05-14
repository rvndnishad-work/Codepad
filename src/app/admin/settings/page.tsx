import { getNavLinks } from "@/lib/settings";
import SettingsForm from "./SettingsForm";

export const metadata = {
  title: "Settings — Admin",
};

export default async function SettingsPage() {
  const links = await getNavLinks();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight">Site Settings</h2>
        <p className="text-sm text-muted mt-1">Configure global application behavior.</p>
      </div>

      <SettingsForm initialLinks={links} />
    </div>
  );
}

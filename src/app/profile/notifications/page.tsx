import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPreferencesView } from "@/lib/notifications/preferences";
import NotificationPreferencesClient from "./NotificationPreferencesClient";

export const metadata = {
  title: "Notification preferences — Interviewpad",
  robots: { index: false, follow: false },
};

export default async function NotificationPreferencesPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile/notifications");
  }
  const prefs = await getPreferencesView(session.user.id);
  return <NotificationPreferencesClient initialPrefs={prefs} />;
}

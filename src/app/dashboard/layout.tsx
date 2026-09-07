import type { ReactNode } from "react";
import "./galaxy/galaxy.css";

/** Route layout so the Milky Way stylesheet loads with /dashboard. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}

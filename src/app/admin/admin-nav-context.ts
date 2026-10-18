"use client";

import { createContext, useContext } from "react";

/** Icon-only rail state for the admin sidebar (mirrors the workspace sidebar). */
export const AdminNavCollapsedContext = createContext(false);

export function useAdminNavCollapsed(): boolean {
  return useContext(AdminNavCollapsedContext);
}

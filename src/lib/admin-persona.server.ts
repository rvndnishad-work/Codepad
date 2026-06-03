import "server-only";
import { cookies } from "next/headers";
import {
  ADMIN_PERSONA_COOKIE,
  DEFAULT_ADMIN_PERSONA,
  type AdminPersona,
} from "./admin-persona";

/**
 * Read the admin's selected persona from the cookie store. Falls back to
 * the default when unset or holding an unrecognised value.
 *
 * Server-only — must be called from a server component or route handler.
 */
export async function getAdminPersona(): Promise<AdminPersona> {
  const store = await cookies();
  const raw = store.get(ADMIN_PERSONA_COOKIE)?.value;
  return raw === "recruiter" ? "recruiter" : DEFAULT_ADMIN_PERSONA;
}

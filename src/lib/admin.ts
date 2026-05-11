import type { Session } from "next-auth";

function adminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdmin(session: Session | null | undefined): boolean {
  const email = session?.user?.email?.toLowerCase();
  if (!email) return false;
  return adminEmails().has(email);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.toLowerCase());
}

// Client-safe types and constants for the admin persona toggle.
// Server-side cookie reading lives in admin-persona.server.ts so that
// importing this file from a "use client" component doesn't pull
// next/headers into the browser bundle.

export type AdminPersona = "candidate" | "recruiter";

/** Cookie key holding the admin's preferred sidebar persona. */
export const ADMIN_PERSONA_COOKIE = "admin-persona";

/** Default mode when no cookie is set. Most admin time is moderation. */
export const DEFAULT_ADMIN_PERSONA: AdminPersona = "candidate";

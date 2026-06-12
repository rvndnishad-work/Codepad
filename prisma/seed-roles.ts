/**
 * Seed script: system Roles + their permission sets, plus the
 * ADMIN_EMAILS → PLATFORM_ADMIN backfill.
 *
 * Run with: npx tsx prisma/seed-roles.ts   (or `npm run seed:roles`)
 *
 * Idempotent and re-runnable: each system role's permission set is reset to the
 * canonical spec below on every run, so adding a permission to a role here and
 * re-seeding updates existing installs. System roles are flagged isSystem=true
 * (the admin role editor protects them from deletion).
 *
 * The ADMIN_EMAILS backfill is the safety net for Phase 2: before any
 * `isAdmin(session)` check is replaced by a permission check, every current
 * staff email must already hold PLATFORM_ADMIN or they'd be locked out. Running
 * this seed grants it; it's idempotent so re-running is harmless.
 *
 * Permissions are validated against the code catalogue (isPermissionGrant) so
 * the DB can never carry a grant the code doesn't enforce.
 */
import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";
import {
  WORKSPACE_PERMISSIONS,
  isPermissionGrant,
} from "../src/lib/permissions/permissions";

const prisma = new PrismaClient();

type RoleSpec = {
  key: string;
  label: string;
  scope: "GLOBAL" | "WORKSPACE";
  description: string;
  /** Concrete permissions and/or wildcards ("*", "resource:*"). */
  permissions: string[];
};

const ROLE_SPECS: RoleSpec[] = [
  // ── Workspace roles (referenced by WorkspaceMember.role) ──────────────────
  {
    key: "OWNER",
    label: "Owner",
    scope: "WORKSPACE",
    description: "Full control of the workspace, including ownership.",
    permissions: [...WORKSPACE_PERMISSIONS],
  },
  {
    key: "ADMIN",
    label: "Admin",
    scope: "WORKSPACE",
    description: "Manages everything except owner-level workspace settings.",
    // All workspace permissions except workspace:manage (owner-exclusive).
    permissions: WORKSPACE_PERMISSIONS.filter((p) => p !== "workspace:manage"),
  },
  {
    key: "RECRUITER",
    label: "Recruiter",
    scope: "WORKSPACE",
    description: "Runs the pipeline: candidates, challenges, interviews.",
    permissions: [
      "candidate:*",
      "challenge:*",
      "takehome:*",
      "interview:read",
      "interview:conduct",
      "member:read",
    ],
  },
  {
    key: "INTERVIEWER",
    label: "Interviewer",
    scope: "WORKSPACE",
    description: "Conducts interviews and assigns take-homes.",
    permissions: [
      "candidate:read",
      "challenge:read",
      "takehome:read",
      "takehome:create",
      "interview:read",
      "interview:conduct",
      "member:read",
    ],
  },
  {
    key: "VIEWER",
    label: "Viewer",
    scope: "WORKSPACE",
    description: "Read-only access across the workspace.",
    permissions: [
      "candidate:read",
      "challenge:read",
      "takehome:read",
      "interview:read",
      "member:read",
    ],
  },

  // ── Global platform roles (assigned via UserRole) ─────────────────────────
  {
    key: "PLATFORM_ADMIN",
    label: "Platform Admin",
    scope: "GLOBAL",
    description: "Full platform staff access.",
    permissions: ["*"],
  },
  {
    key: "MODERATOR",
    label: "Moderator",
    scope: "GLOBAL",
    description: "Moderates comments and user-generated content.",
    permissions: ["comment:moderate", "content:moderate"],
  },
  {
    key: "CONTENT_MANAGER",
    label: "Content Manager",
    scope: "GLOBAL",
    description: "Curates the content catalogue (feature, publish, categorize).",
    permissions: ["content:moderate", "content:curate"],
  },
  {
    key: "CREATOR",
    label: "Creator",
    scope: "GLOBAL",
    description: "Authors and sells exclusive content; has a creator page.",
    permissions: ["content:author", "product:sell", "creator:page"],
  },
];

async function seedRoles() {
  for (const spec of ROLE_SPECS) {
    const invalid = spec.permissions.filter((p) => !isPermissionGrant(p));
    if (invalid.length) {
      throw new Error(
        `Role "${spec.key}" references unknown permission(s): ${invalid.join(", ")}`,
      );
    }

    const role = await prisma.role.upsert({
      where: { key: spec.key },
      update: {
        label: spec.label,
        scope: spec.scope,
        description: spec.description,
        isSystem: true,
      },
      create: {
        key: spec.key,
        label: spec.label,
        scope: spec.scope,
        description: spec.description,
        isSystem: true,
      },
    });

    // Reset the permission set to the canonical spec (idempotent re-seed).
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: spec.permissions.map((permission) => ({
        roleId: role.id,
        permission,
      })),
      skipDuplicates: true,
    });
    console.log(
      `Seeded role ${spec.key} (${spec.scope}) with ${spec.permissions.length} grant(s).`,
    );
  }
}

async function backfillPlatformAdmins() {
  const emails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    console.log("ADMIN_EMAILS is empty — no PLATFORM_ADMIN backfill needed.");
    return;
  }

  const adminRole = await prisma.role.findUnique({
    where: { key: "PLATFORM_ADMIN" },
    select: { id: true },
  });
  if (!adminRole) throw new Error("PLATFORM_ADMIN role missing after seed.");

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });

  for (const user of users) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
      update: {},
      create: { userId: user.id, roleId: adminRole.id },
    });
    console.log(`Granted PLATFORM_ADMIN to ${user.email}.`);
  }

  const missing = emails.filter(
    (e) => !users.some((u) => u.email?.toLowerCase() === e),
  );
  if (missing.length) {
    console.warn(
      `ADMIN_EMAILS entries with no matching user (skipped): ${missing.join(", ")}`,
    );
  }
}

async function main() {
  await seedRoles();
  await backfillPlatformAdmins();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error(err);
      await prisma.$disconnect();
      process.exit(1);
    });
}

export { ROLE_SPECS, seedRoles, backfillPlatformAdmins };

/**
 * Authorization engine. One `can(subject, permission, resource?)` primitive
 * over three scopes (workspace, platform, creator) backed by code-defined
 * permissions and DB-defined roles. See ./permissions.ts for the model docs.
 *
 *   // global (platform/creator) check
 *   if (await userCan(userId, "content:curate")) { ... }
 *
 *   // workspace check
 *   const member = await loadWorkspaceMember(workspaceId, userId);
 *   if (!member || !can(member.subject, "integration:manage")) { 403 }
 */
export {
  PERMISSIONS,
  WORKSPACE_PERMISSIONS,
  PLATFORM_PERMISSIONS,
  CREATOR_PERMISSIONS,
  OWNABLE_CONTENT_TYPES,
  isPermission,
  type Permission,
  type OwnableContentType,
} from "./permissions";

export {
  can,
  expandRolePermissions,
  resolveEffective,
  asOverrides,
  type Subject,
  type OwnedResource,
  type PermissionOverrides,
} from "./resolve";

export {
  PermissionError,
  loadRolePermissions,
  loadUserPermissions,
  getGlobalSubject,
  userCan,
  loadWorkspaceMember,
  canMember,
  requirePermission,
  type WorkspaceMemberAccess,
} from "./access";

export { MANAGER_ROLES, STAFF_ROLES } from "./role-groups";

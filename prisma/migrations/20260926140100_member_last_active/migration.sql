-- Members page: when each workspace member last opened the workspace.
ALTER TABLE "WorkspaceMember" ADD COLUMN "lastActiveAt" TIMESTAMP(3);

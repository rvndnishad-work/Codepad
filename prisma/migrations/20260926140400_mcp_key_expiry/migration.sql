-- API and MCP: optional expiry per key. Null means the key never expires.
ALTER TABLE "McpApiKey" ADD COLUMN "expiresAt" TIMESTAMP(3);

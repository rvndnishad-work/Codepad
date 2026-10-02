/**
 * Maintenance areas the assistant can schedule, with the path prefixes each
 * covers. Mirrors the area registry of the maintenance phase (P4,
 * src/lib/admin/maintenance-rules.ts `AREAS`); once that lands this file
 * should re-export from it so there is one list.
 */
const ROOM = ["/w/*/interviews/*/room", "/w/*/interviews/*/lobby", "/interview/*", "/api/interview", "/api/livekit", "/api/lobby"];
const AI_SCREENING = ["/ai-interview", "/api/ai-interview"];
const TAKE_HOME = ["/take-home", "/api/take-home"];
const CANDIDATE = [...TAKE_HOME, ...AI_SCREENING, ...ROOM, "/invite"];
const PLAYGROUND = ["/play", "/playgrounds", "/api/execute", "/api/playground", "/api/snippets"];
const CREATORS = ["/creators", "/c", "/purchase", "/become-creator"];

export const ASSISTANT_AREAS: { key: string; label: string; paths: string[] }[] = [
  { key: "site", label: "Whole site", paths: ["/"] },
  { key: "hiring", label: "Hiring side", paths: ["/w", "/hire", "/api/w", ...CANDIDATE] },
  { key: "candidate-links", label: "Candidate links", paths: CANDIDATE },
  { key: "room", label: "Interview room", paths: ROOM },
  { key: "ai-screening", label: "AI screening, candidate side", paths: AI_SCREENING },
  {
    key: "dev",
    label: "Developer side",
    paths: [...PLAYGROUND, "/challenges", "/challenge", "/interview-questions", "/interview-question", "/blog", "/api/challenges", "/api/interview-questions", "/api/blogs", ...CREATORS],
  },
  { key: "playground", label: "Playground", paths: PLAYGROUND },
  { key: "creators", label: "Creator marketplace", paths: CREATORS },
  { key: "public-api", label: "Public API and MCP", paths: ["/api/mcp", "/api/openapi"] },
];

export const AREA_KEYS = ASSISTANT_AREAS.map((a) => a.key);

export function areaLabel(key: string): string {
  return ASSISTANT_AREAS.find((a) => a.key === key)?.label ?? key;
}

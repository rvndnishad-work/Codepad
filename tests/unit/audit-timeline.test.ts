import { describe, expect, it } from "vitest";
import {
  ACTOR_AUTOMATION,
  auditCsv,
  auditQueryParams,
  auditWhere,
  auditWindow,
  categoryOf,
  csvCell,
  describeAuditRow,
  groupByDay,
  pageWindow,
  parseAuditQuery,
} from "@/lib/workspace/audit-timeline";

const NOW = new Date("2026-09-26T12:00:00.000Z");

describe("parseAuditQuery", () => {
  it("falls back to safe defaults for junk input", () => {
    expect(parseAuditQuery({ category: "nope", range: "forever", from: "yesterday", page: "-3" })).toEqual({
      category: "all",
      actor: "",
      range: "30d",
      from: "",
      to: "",
      page: 1,
    });
  });

  it("keeps valid filters and round-trips through URL params", () => {
    const q = parseAuditQuery({ category: "people", actor: "u1", range: "custom", from: "2026-09-01", to: "2026-09-10", page: "3" });
    expect(q).toEqual({ category: "people", actor: "u1", range: "custom", from: "2026-09-01", to: "2026-09-10", page: 3 });
    expect(parseAuditQuery(Object.fromEntries(auditQueryParams(q)))).toEqual(q);
  });

  it("drops defaults from the URL", () => {
    expect(auditQueryParams(parseAuditQuery({})).toString()).toBe("");
  });
});

describe("categoryOf", () => {
  it.each([
    ["PIPELINE_STAGE_CHANGED", "decisions"],
    ["CANDIDATE_NOTE_ADDED", "candidates"],
    ["CANDIDATES_IMPORTED", "candidates"],
    ["BATCH_CREATED", "candidates"],
    ["AI_SCREENING_REMINDED", "screenings"],
    ["TAKE_HOME_EXTENDED", "screenings"],
    ["INTERVIEWS_SCHEDULED", "screenings"],
    ["MEMBER_REMOVED", "people"],
    ["API_KEY_REVOKED", "connections"],
    ["MCP_TOOL_CALLED", "connections"],
    ["WEBHOOK_ENDPOINT_CREATED", "connections"],
    ["ATS_INTEGRATION_CONNECTED", "connections"],
    ["BILLING_PLAN_CHANGED", "billing"],
    ["SOMETHING_NEW", "other"],
  ])("%s is %s", (action, cat) => {
    expect(categoryOf(action)).toBe(cat);
  });
});

describe("auditWhere", () => {
  it("scopes to the workspace and the default 30 day window", () => {
    expect(auditWhere("ws1", parseAuditQuery({}), NOW)).toEqual({
      AND: [{ workspaceId: "ws1" }, { createdAt: { gte: new Date("2026-08-27T12:00:00.000Z") } }],
    });
  });

  it("filters by category prefixes, a person, and all time", () => {
    const where = auditWhere("ws1", parseAuditQuery({ category: "candidates", actor: "u9", range: "all" }), NOW);
    expect(where).toEqual({
      AND: [
        { workspaceId: "ws1" },
        {
          OR: [
            { action: { in: ["CANDIDATES_IMPORTED"] } },
            { action: { startsWith: "CANDIDATE_" } },
            { action: { startsWith: "BATCH_" } },
          ],
        },
        { actorUserId: "u9" },
      ],
    });
  });

  it("uses a single rule without an OR wrapper, and null actor for automation", () => {
    const where = auditWhere("ws1", parseAuditQuery({ category: "decisions", actor: ACTOR_AUTOMATION, range: "all" }), NOW);
    expect(where).toEqual({
      AND: [{ workspaceId: "ws1" }, { action: { in: ["PIPELINE_STAGE_CHANGED"] } }, { actorUserId: null }],
    });
  });

  it("includes the whole last day of a custom range", () => {
    expect(auditWindow({ range: "custom", from: "2026-09-01", to: "2026-09-10" }, NOW)).toEqual({
      gte: new Date("2026-09-01T00:00:00.000Z"),
      lt: new Date("2026-09-11T00:00:00.000Z"),
    });
    expect(auditWindow({ range: "custom", from: "", to: "" }, NOW)).toEqual({});
  });
});

describe("pageWindow", () => {
  it("clamps pages and reports the visible range", () => {
    expect(pageWindow(1, 0, 50)).toEqual({ page: 1, pages: 1, skip: 0, take: 50, first: 0, last: 0 });
    expect(pageWindow(2, 120, 50)).toEqual({ page: 2, pages: 3, skip: 50, take: 50, first: 51, last: 100 });
    expect(pageWindow(9, 120, 50)).toEqual({ page: 3, pages: 3, skip: 100, take: 50, first: 101, last: 120 });
  });
});

describe("describeAuditRow", () => {
  const row = (action: string, meta: Record<string, unknown> | null, extra: Partial<Parameters<typeof describeAuditRow>[0]> = {}) => ({
    action,
    meta,
    actorEmail: "priya@northwind.io",
    actorUserId: "u1",
    targetType: "candidate",
    targetId: "c1",
    ...extra,
  });

  it("flags a pass over results below the bar as a manual override", () => {
    const s = describeAuditRow(
      row("PIPELINE_STAGE_CHANGED", { candidateName: "Tomasz Nowak", fromStage: "SCREENING", toStage: "PASSED", manualOverride: "AI screening 52, Below bar" }),
      { u1: "Priya Shah" },
    );
    expect(s).toMatchObject({
      title: "Passed Tomasz Nowak",
      tag: "Manual override",
      tone: "override",
      actor: "Priya Shah",
      path: "candidates/c1",
    });
    expect(s.detail).toBe("Was Screening. Results below the bar: AI screening 52, Below bar.");
  });

  it("names the key for changes made through MCP", () => {
    const s = describeAuditRow(
      row("MCP_TOOL_CALLED", { tool: "add_candidate_note", candidateName: "Julia Rossi", apiKeyLabel: "Weekly hiring report" }, { actorEmail: null, actorUserId: null }),
    );
    expect(s.title).toBe("Called add_candidate_note on Julia Rossi");
    expect(s.actor).toBe("Key: Weekly hiring report");
  });

  it("describes a new API key with its access and expiry", () => {
    const s = describeAuditRow(
      row("API_KEY_CREATED", { label: "Priya, Claude desktop", scopes: ["read", "write"], expiresInDays: 90 }, { targetType: "mcpApiKey" }),
    );
    expect(s).toMatchObject({ title: "Created API key Priya, Claude desktop", detail: "Read and write. Expires in 90 days.", path: null });
  });

  it("finishes sentences without a name and marks removals as danger", () => {
    expect(describeAuditRow(row("CANDIDATE_CREATED", null)).title).toBe("Added a candidate");
    expect(describeAuditRow(row("MEMBER_REMOVED", { email: "jonas@northwind.io" })).tone).toBe("danger");
    expect(describeAuditRow(row("SOMETHING_NEW", null)).title).toBe("Something new");
  });

  it("labels automatic moves", () => {
    const s = describeAuditRow(
      row("PIPELINE_STAGE_CHANGED", { candidateName: "Ana Lima", fromStage: "NEW", toStage: "SCREENING", source: "auto:ai-screening-completed" }, { actorEmail: null, actorUserId: null }),
    );
    expect(s.title).toBe("Moved Ana Lima to Screening");
    expect(s.actor).toBe("Automatic");
  });
});

describe("CSV", () => {
  it("quotes commas and quotes, and defuses formulas", () => {
    expect(csvCell('a, "b"')).toBe('"a, ""b"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(null)).toBe("");
  });

  it("writes one readable line per row", () => {
    const csv = auditCsv([
      {
        action: "API_KEY_REVOKED",
        meta: { label: "Old Cursor key" },
        rawMeta: '{"label":"Old Cursor key"}',
        actorEmail: "dan@northwind.io",
        actorUserId: null,
        targetType: "mcpApiKey",
        targetId: "k1",
        ip: "10.0.0.1",
        createdAt: "2026-09-25T17:05:00.000Z",
      },
    ]);
    const [header, line] = csv.trim().split("\n");
    expect(header).toBe("created_at,category,summary,detail,actor,action,target_type,target_id,ip,meta");
    expect(line).toBe(
      '2026-09-25T17:05:00.000Z,Connections and keys,Revoked API key Old Cursor key,,dan@northwind.io,API_KEY_REVOKED,mcpApiKey,k1,10.0.0.1,"{""label"":""Old Cursor key""}"',
    );
  });
});

describe("groupByDay", () => {
  it("groups consecutive rows by UTC day with Today and Yesterday headings", () => {
    const rows = [
      { id: "a", createdAt: "2026-09-26T09:40:00.000Z" },
      { id: "b", createdAt: "2026-09-26T08:31:00.000Z" },
      { id: "c", createdAt: "2026-09-25T17:05:00.000Z" },
      { id: "d", createdAt: "2026-09-20T11:00:00.000Z" },
    ];
    const g = groupByDay(rows, NOW, true);
    expect(g.map((x) => x.rows.map((r) => r.id))).toEqual([["a", "b"], ["c"], ["d"]]);
    expect(g[0].day).toBe("Today");
    expect(g[1].day).toBe("Yesterday");
    // Month abbreviations vary by ICU version ("Sep" or "Sept").
    expect(g[2].day).toMatch(/^Sun 20 Sep/);
  });
});

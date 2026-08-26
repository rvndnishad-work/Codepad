import { describe, it, expect } from "vitest";
import { forWorkspace } from "@/lib/prisma";

describe("forWorkspace tenant scoping extension", () => {
  it("creates an extended prisma client instance for a given workspace", () => {
    const scopedPrisma = forWorkspace("ws_test_123");
    expect(scopedPrisma).toBeDefined();
    expect(typeof scopedPrisma.candidate.findMany).toBe("function");
    expect(typeof scopedPrisma.candidate.count).toBe("function");
    expect(typeof scopedPrisma.candidate.aggregate).toBe("function");
    expect(typeof scopedPrisma.candidate.groupBy).toBe("function");
    expect(typeof scopedPrisma.interviewSession.findMany).toBe("function");
    expect(typeof scopedPrisma.takeHomeAssignment.findMany).toBe("function");
    expect(typeof scopedPrisma.aIInterviewSession.findMany).toBe("function");
    expect(typeof scopedPrisma.workspaceAuditLog.findMany).toBe("function");
  });
});

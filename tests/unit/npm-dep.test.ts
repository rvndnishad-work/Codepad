import { describe, expect, it } from "vitest";
import { parseDepInput } from "@/lib/npm-dep";

/**
 * Contract for the Dependencies "package or pkg@version" input.
 * An explicitly typed version is an instruction and must survive; a bare
 * name (with or without stray separators) defaults to latest.
 */
describe("parseDepInput", () => {
  it("parses bare names to latest", () => {
    expect(parseDepInput("axios")).toEqual({
      name: "axios",
      version: "latest",
      hasVersion: false,
    });
    expect(parseDepInput("  lodash  ")).toEqual({
      name: "lodash",
      version: "latest",
      hasVersion: false,
    });
  });

  it("parses explicit versions incl. ranges and tags", () => {
    expect(parseDepInput("axios@1.2.3")).toEqual({
      name: "axios",
      version: "1.2.3",
      hasVersion: true,
    });
    expect(parseDepInput("react@^19.0.0")).toEqual({
      name: "react",
      version: "^19.0.0",
      hasVersion: true,
    });
    expect(parseDepInput("redux@beta")).toEqual({
      name: "redux",
      version: "beta",
      hasVersion: true,
    });
  });

  it("handles scoped packages", () => {
    expect(parseDepInput("@mui/material")).toEqual({
      name: "@mui/material",
      version: "latest",
      hasVersion: false,
    });
    expect(parseDepInput("@mui/material@6.2.1")).toEqual({
      name: "@mui/material",
      version: "6.2.1",
      hasVersion: true,
    });
    expect(parseDepInput("@scope/pkg@ next ")).toEqual({
      name: "@scope/pkg",
      version: "next",
      hasVersion: true,
    });
  });

  it("treats stray separators and blanks as bare names or null", () => {
    expect(parseDepInput("axios@")).toEqual({
      name: "axios",
      version: "latest",
      hasVersion: false,
    });
    expect(parseDepInput("")).toBeNull();
    expect(parseDepInput("   ")).toBeNull();
    expect(parseDepInput("@")).toBeNull();
    expect(parseDepInput("@scope/")).toBeNull();
  });
});

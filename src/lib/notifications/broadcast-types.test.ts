import { describe, expect, it } from "vitest";
import { broadcastHrefError } from "./broadcast-types";

describe("broadcastHrefError", () => {
  it.each(["", "/pricing", "/w/acme/candidates?tab=new#x", "https://codepad.dev/blog", "  /trim  "])(
    "accepts %j",
    (h) => {
      expect(broadcastHrefError(h)).toBeNull();
    },
  );

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,hi",
    "http://example.com",
    "//evil.example",
    "/\\evil.example",
    "example.com/path",
    "pricing",
    "/path with space",
    "https://",
  ])("refuses %j", (h) => {
    expect(broadcastHrefError(h)).not.toBeNull();
  });
});

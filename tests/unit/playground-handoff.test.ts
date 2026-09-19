import { describe, expect, it } from "vitest";
import {
  encodePlaygroundCode,
  decodePlaygroundCode,
  encodePlaygroundFiles,
  decodePlaygroundFiles,
  playgroundHref,
  playgroundFilesHref,
} from "@/lib/playground-handoff";

/**
 * Contract for "Open in Playground" handoffs. Code rides in the URL hash;
 * a broken round-trip strands users on an empty playground.
 */
describe("playground handoff", () => {
  it("round-trips code incl. unicode and special chars", () => {
    const code = `export default function App() {\n  return <h1>Héllo 👋 & "quotes"</h1>;\n}`;
    expect(decodePlaygroundCode(`#code=${encodePlaygroundCode(code)}`)).toBe(code);
  });

  it("round-trips multi-file maps", () => {
    const files = { "/App.js": "a", "/src/Otp.js": "b" };
    const hash = `#files=${encodePlaygroundFiles(files)}`;
    expect(decodePlaygroundFiles(hash)).toEqual(files);
  });

  it("returns null for absent or garbled payloads", () => {
    expect(decodePlaygroundCode("#foo=bar")).toBeNull();
    expect(decodePlaygroundCode("#code=!!!")).toBeNull();
    expect(decodePlaygroundFiles("#files=!!!")).toBeNull();
    expect(decodePlaygroundFiles("#files=" + encodePlaygroundCode("[1,2]"))).toBeNull();
  });

  it("builds hrefs that survive the mount-time hash strip", () => {
    const href = playgroundHref("code", "empty-react", "/q/slug");
    expect(href.startsWith("/play?template=empty-react&from=%2Fq%2Fslug#code=")).toBe(true);
    const filesHref = playgroundFilesHref({ "/A.js": "x" }, "react");
    expect(filesHref.startsWith("/play?template=react#files=")).toBe(true);
    expect(playgroundHref("c")).toContain("template=empty-react");
  });
});

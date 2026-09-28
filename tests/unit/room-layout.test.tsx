// @vitest-environment jsdom
/**
 * Room layout helpers: the task text without a repeated title, the media
 * query hook, and the call strip used on phones and touch tablets.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, renderHook, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), prefetch: vi.fn() }) }));

import { COMPACT_CALL, ROLE_TONE, RoleAvatar, useMedia, withoutTitle } from "@/app/w/[slug]/(room)/_room/parts";
import { VideoCall } from "@/app/w/[slug]/(room)/_room/video/VideoCall";
import { CallDock } from "@/app/w/[slug]/(room)/_room/video/CallDock";

function stubMatchMedia(matches: (q: string) => boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: matches(q),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("withoutTitle", () => {
  it("drops a first heading that repeats the title", () => {
    expect(withoutTitle("# Search box\n\nBuild it.", "Search box")).toBe("Build it.");
    expect(withoutTitle("  ## search BOX  \nBuild it.", "Search box")).toBe("Build it.");
  });
  it("keeps other headings and plain text", () => {
    expect(withoutTitle("# Something else\n\nBuild it.", "Search box")).toBe("# Something else\n\nBuild it.");
    expect(withoutTitle("Build it.\n# Search box", "Search box")).toBe("Build it.\n# Search box");
  });
});

describe("useMedia", () => {
  it("is false where matchMedia is missing", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { result } = renderHook(() => useMedia(COMPACT_CALL));
    expect(result.current).toBe(false);
  });
  it("follows the query", () => {
    stubMatchMedia((q) => q === COMPACT_CALL);
    expect(renderHook(() => useMedia(COMPACT_CALL)).result.current).toBe(true);
    expect(renderHook(() => useMedia("(min-width: 1280px)")).result.current).toBe(false);
  });
});

describe("CallDock on a phone", () => {
  it("is a strip in the page flow, with Rejoin when the call could not start", async () => {
    stubMatchMedia((q) => q === COMPACT_CALL);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "No call yet." }), { status: 403 })));
    render(
      <VideoCall sessionId="s1" enabled>
        <CallDock myRole="candidate" others="Alex" onHangUp={() => {}} />
      </VideoCall>,
    );
    await waitFor(() => expect(screen.getByText("No call yet.")).toBeTruthy());
    const dock = screen.getByRole("region", { name: "Video call" });
    expect(dock.className).not.toMatch(/\babsolute\b/);
    expect(screen.getByRole("button", { name: /Rejoin/ })).toBeTruthy();
  });
});

describe("RoleAvatar", () => {
  it("tints by role, not by name, so the two sides of the table differ", () => {
    const { container } = render(
      <>
        <RoleAvatar name="Alex Morgan" role="interviewer" />
        <RoleAvatar name="Alex Morgan" role="candidate" />
      </>,
    );
    const [a, b] = [...container.querySelectorAll("span")];
    for (const cls of ROLE_TONE.interviewer.split(" ")) expect(a.className).toContain(cls);
    for (const cls of ROLE_TONE.candidate.split(" ")) expect(b.className).toContain(cls);
  });
});

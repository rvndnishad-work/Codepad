/**
 * The room's recording control without a LiveKit server: the API says
 * whether the call is recorded and why Record would not work.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RecordingControl } from "@/app/w/[slug]/(room)/_room/video/Recording";

afterEach(() => {
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("RecordingControl", () => {
  it("shows the candidate a Recording label while the call is recorded, and no controls", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ recording: true, startedAt: "2026-09-28T10:00:00Z" })));
    render(<RecordingControl sessionId="s1" active interviewer={false} recordVideo />);
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Recording"));
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows nothing to the candidate when the call is not recorded", async () => {
    const f = vi.fn(async () => json({ recording: false, startedAt: null }));
    vi.stubGlobal("fetch", f);
    const { container } = render(<RecordingControl sessionId="s1" active interviewer={false} recordVideo />);
    await waitFor(() => expect(f).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("keeps Record off for the host and says why", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ recording: false, startedAt: null, canStart: false, code: "no_consent", reason: "The candidate has not agreed to be recorded yet. They agree in the lobby before joining." })),
    );
    render(<RecordingControl sessionId="s1" active interviewer recordVideo />);
    const btn = await screen.findByRole("button", { name: /Record/ });
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(true));
    expect(screen.getByText("Candidate has not agreed")).toBeTruthy();
    expect(btn.parentElement?.getAttribute("title")).toMatch(/has not agreed/);
  });

  it("asks before starting, then starts and shows the label and Stop", async () => {
    const f = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "POST" ? json({ recording: true, startedAt: "2026-09-28T10:00:00Z", canStart: false, reason: null }) : json({ recording: false, startedAt: null, canStart: true, reason: null }),
    );
    vi.stubGlobal("fetch", f);
    render(<RecordingControl sessionId="s1" active interviewer recordVideo />);
    const btn = await screen.findByRole("button", { name: /Record/ });
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(btn);
    expect(screen.getByRole("dialog").textContent).toContain("deleted after 7 days");
    expect(f.mock.calls.some(([, i]) => i?.method === "POST")).toBe(false);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    });
    expect(f).toHaveBeenCalledWith("/api/interview/s1/recording", { method: "POST", cache: "no-store" });
    await waitFor(() => expect(screen.getByRole("button", { name: /Stop recording/ })).toBeTruthy());
    expect(screen.getByRole("status").textContent).toContain("Recording");
  });

  it("shows no control when the interview was not set up to be recorded", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ recording: false, startedAt: null, canStart: false, reason: "off" })));
    render(<RecordingControl sessionId="s1" active interviewer recordVideo={false} />);
    await waitFor(() => expect(screen.queryByRole("button")).toBeNull());
  });
});

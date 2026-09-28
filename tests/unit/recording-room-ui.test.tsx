/**
 * The room's recording control without a LiveKit server: the API says
 * whether the call is recorded, what Record does, and whether the
 * candidate is being asked.
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

  it("keeps Record visible when it cannot work, and says why when pressed", async () => {
    const reason = "Recording is not set up yet. Ask whoever runs Interviewpad for your team to finish the setup.";
    vi.stubGlobal("fetch", vi.fn(async () => json({ recording: false, startedAt: null, canStart: false, control: "blocked", code: "not_set_up", reason })));
    render(<RecordingControl sessionId="s1" active interviewer recordVideo={false} />);
    const btn = await screen.findByRole("button", { name: /Record the call, not available/ });
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false));
    expect(btn.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Not set up")).toBeTruthy();
    // A tap (tooltips do not work on touch) opens the reason.
    fireEvent.click(btn);
    expect(screen.getByRole("dialog", { name: "About recording" }).textContent).toContain(reason);
  });

  it("asks before starting, then starts and shows the label and Stop", async () => {
    const f = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json({ recording: true, startedAt: "2026-09-28T10:00:00Z", canStart: false, control: "recording", reason: null })
        : json({ recording: false, startedAt: null, canStart: true, control: "start", reason: null }),
    );
    vi.stubGlobal("fetch", f);
    render(<RecordingControl sessionId="s1" active interviewer recordVideo />);
    const btn = await screen.findByRole("button", { name: "Record the call" });
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

  it("offers Record when the interview was not set up to be recorded, and asks the candidate", async () => {
    let asked = false;
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/consent")) {
        asked = true;
        return json({ recording: false, startedAt: null, canStart: false, control: "waiting", candidateName: "Tomasz Nowak", reason: "asked" });
      }
      return json({ recording: false, startedAt: null, canStart: false, control: asked ? "waiting" : "ask", candidateName: "Tomasz Nowak", reason: null, method: init?.method });
    });
    vi.stubGlobal("fetch", f);
    render(<RecordingControl sessionId="s1" active interviewer recordVideo={false} />);
    fireEvent.click(await screen.findByRole("button", { name: "Record the call" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Ask Tomasz to record this call?");
    expect(dialog.textContent).toContain("can say no");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Ask Tomasz" }));
    });
    const call = f.mock.calls.find(([u]) => u.endsWith("/consent"))!;
    expect(call[0]).toBe("/api/interview/s1/recording/consent");
    expect(JSON.parse(String(call[1]?.body))).toEqual({ action: "ask" });
    expect(await screen.findByRole("button", { name: "Waiting for Tomasz to agree" })).toBeTruthy();
  });

  it("tells the host when the candidate said no", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ recording: false, startedAt: null, canStart: false, control: "declined", candidateName: "Tomasz Nowak", reason: "no" })));
    render(<RecordingControl sessionId="s1" active interviewer recordVideo={false} />);
    const btn = await screen.findByRole("button", { name: "Tomasz chose not to be recorded" });
    fireEvent.click(btn);
    expect(screen.getByRole("dialog", { name: "About recording" }).textContent).toContain("Tomasz chose not to be recorded. They are not asked again in this interview.");
  });

  it("asks the candidate in the room and sends their answer", async () => {
    let answered: string | null = null;
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/consent")) {
        answered = JSON.parse(String(init?.body)).action;
        return json({ recording: answered === "allow", startedAt: null });
      }
      return json(answered ? { recording: answered === "allow", startedAt: null } : { recording: false, startedAt: null, ask: { by: "Alex Morgan" } });
    });
    vi.stubGlobal("fetch", f);
    render(<RecordingControl sessionId="s1" active interviewer={false} recordVideo={false} />);
    const dialog = await screen.findByRole("dialog", { name: "Record this call?" });
    expect(dialog.textContent).toContain("Alex Morgan would like to record this call. The recording is kept for 7 days, then deleted.");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Allow recording" }));
    });
    expect(answered).toBe("allow");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Recording"));
  });

  it("lets the candidate say no", async () => {
    let answered: string | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith("/consent")) answered = JSON.parse(String(init?.body)).action;
        return json(answered ? { recording: false, startedAt: null } : { recording: false, startedAt: null, ask: { by: null } });
      }),
    );
    render(<RecordingControl sessionId="s1" active interviewer={false} recordVideo={false} />);
    expect((await screen.findByRole("dialog")).textContent).toContain("Your interviewer would like to record this call.");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Don't record" }));
    });
    expect(answered).toBe("decline");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

/**
 * The call UI states that do not need a live LiveKit server: a refused join,
 * the lobby check (blocked camera, remembered choices), and the no add-on
 * cards. Candidates never see prices.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), prefetch: vi.fn() }) }));

import { VideoCall } from "@/app/w/[slug]/(room)/_room/video/VideoCall";
import { CallChip, CallState } from "@/app/w/[slug]/(room)/_room/video/CallParts";
import { CallDock } from "@/app/w/[slug]/(room)/_room/video/CallDock";
import { LobbyVideo } from "@/app/w/[slug]/(room)/_room/video/LobbyVideo";
import { NoCallCard, NoCallNote, VideoOfferChip } from "@/app/w/[slug]/(room)/_room/video/NoCall";
import { loadPrefs } from "@/app/w/[slug]/(room)/_room/video/prefs";
import type { RoomVideo } from "@/lib/video/room-video";

const video = (over: Partial<RoomVideo> = {}): RoomVideo => ({
  mode: "none",
  configured: true,
  canOffer: true,
  offerUpgrade: false,
  addonOn: false,
  builtinVideo: true,
  billingHref: "/w/acme/billing",
  ...over,
});

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VideoCall when the server refuses a token", () => {
  it("shows the plain reason and a Rejoin button, in the dock and the top bar", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: "This interview has ended, so the call is closed." }), { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <VideoCall sessionId="s1" enabled>
        <CallChip />
        <div style={{ position: "relative" }}>
          <CallDock myRole="candidate" others="Alex" />
        </div>
      </VideoCall>,
    );
    await waitFor(() => expect(screen.getByText("This interview has ended, so the call is closed.")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith("/api/interview/s1/video", { method: "POST" });
    expect(screen.getByRole("button", { name: /Rejoin call/ })).toBeTruthy();
    // Rejoin asks again.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Rejoin$/ }));
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("does nothing while disabled (link or no-call rooms, ended interviews)", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(
      <VideoCall sessionId="s1" enabled={false}>
        <CallChip />
        <CallState />
      </VideoCall>,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toBe("");
  });
});

describe("LobbyVideo", () => {
  it("asks for nothing until Check camera, then explains a blocked camera", async () => {
    const getUserMedia = vi.fn(async () => {
      throw Object.assign(new Error("denied"), { name: "NotAllowedError" });
    });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia, enumerateDevices: vi.fn(async () => []) } });
    render(<LobbyVideo />);
    expect(getUserMedia).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Check camera/ }));
    });
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: true });
    expect(screen.getByRole("alert").textContent).toMatch(/blocked the camera or microphone/);
    expect(screen.getByRole("button", { name: /Join with sound only/ })).toBeTruthy();
  });

  it("remembers a sound-only choice for the room", async () => {
    const track = { kind: "audio", enabled: true, stop: vi.fn(), getSettings: () => ({ deviceId: "mic-1" }) };
    const stream = { getTracks: () => [track], getAudioTracks: () => [track], getVideoTracks: () => [] };
    const getUserMedia = vi.fn(async () => stream);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia, enumerateDevices: vi.fn(async () => []) } });
    render(<LobbyVideo />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Join with sound only/ }));
    });
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(loadPrefs()).toMatchObject({ checked: true, audioOnly: true, camOn: false, micId: "mic-1" });
    expect(screen.getByText(/You will join with sound only/)).toBeTruthy();
  });
});

describe("No add-on states", () => {
  it("interviewers who manage billing get the link box and the Billing line", () => {
    render(<NoCallCard id="s1" video={video()} candidateName="Tomasz Nowak" />);
    expect(screen.getByText("No call set up for this interview")).toBeTruthy();
    expect(screen.getByLabelText("Meeting link")).toBeTruthy();
    expect(screen.getByRole("link", { name: "See in Billing" }).getAttribute("href")).toBe("/w/acme/billing");
    expect(screen.getByText(/\$15 a month/)).toBeTruthy();
  });

  it("other interviewers get the link box without any offer", () => {
    const { container } = render(<NoCallCard id="s1" video={video({ canOffer: false })} candidateName="Tomasz" />);
    expect(container.textContent).not.toMatch(/\$|Billing|built-in/i);
  });

  it("says when the add-on is on but the server is not set up", () => {
    render(<NoCallCard id="s1" video={video({ configured: false, canOffer: false, addonOn: true })} candidateName="Tomasz" />);
    expect(screen.getByText("Video is not set up yet")).toBeTruthy();
  });

  it("the candidate note has no prices", () => {
    const { container } = render(<NoCallNote />);
    expect(container.textContent).toMatch(/Your interviewer will tell you how you will talk/);
    expect(container.textContent).not.toMatch(/\$|Billing/);
  });

  it("the Built-in video chip opens a short explanation, with Growth wording on Free", () => {
    render(<VideoOfferChip video={video({ mode: "link", offerUpgrade: true })} meetingUrl="https://meet.google.com/abc-defg-hij" />);
    fireEvent.click(screen.getByRole("button", { name: "Built-in video" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toMatch(/Growth plan/);
    expect(screen.getByRole("link", { name: "See plans in Billing" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("the chip is hidden from people who cannot buy it", () => {
    const { container } = render(<VideoOfferChip video={video({ mode: "link", canOffer: false })} meetingUrl={null} />);
    expect(container.textContent).toBe("");
  });
});

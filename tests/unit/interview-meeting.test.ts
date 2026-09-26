import { describe, expect, it } from "vitest";
import { cleanMeetingUrl, meetingProvider } from "@/lib/interview/meeting";

describe("cleanMeetingUrl", () => {
  it("treats empty as no link", () => {
    expect(cleanMeetingUrl("  ")).toEqual({ ok: true, url: null });
    expect(cleanMeetingUrl(null)).toEqual({ ok: true, url: null });
  });
  it("keeps https links and adds https to bare hosts", () => {
    expect(cleanMeetingUrl("https://meet.google.com/abc-defg-hij")).toEqual({ ok: true, url: "https://meet.google.com/abc-defg-hij" });
    expect(cleanMeetingUrl("zoom.us/j/123?pwd=x")).toEqual({ ok: true, url: "https://zoom.us/j/123?pwd=x" });
  });
  it("rejects unsafe or broken links", () => {
    expect(cleanMeetingUrl("javascript:alert(1)").ok).toBe(false);
    expect(cleanMeetingUrl("http://zoom.us/j/1").ok).toBe(false);
    expect(cleanMeetingUrl("https://user:pw@zoom.us/j/1").ok).toBe(false);
    expect(cleanMeetingUrl("not a link").ok).toBe(false);
    expect(cleanMeetingUrl(`https://zoom.us/${"a".repeat(600)}`).ok).toBe(false);
  });
});

describe("meetingProvider", () => {
  it("names common tools", () => {
    expect(meetingProvider("https://us02web.zoom.us/j/1")).toBe("Zoom");
    expect(meetingProvider("https://meet.google.com/x")).toBe("Google Meet");
    expect(meetingProvider("https://teams.microsoft.com/l/meetup-join/x")).toBe("Microsoft Teams");
    expect(meetingProvider("https://acme.webex.com/meet/x")).toBe("Webex");
    expect(meetingProvider("https://example.com/call")).toBeNull();
    expect(meetingProvider("https://notzoom.us.evil.com/j/1")).toBeNull();
  });
});

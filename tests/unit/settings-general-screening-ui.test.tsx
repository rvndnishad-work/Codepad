/**
 * Settings > Screening defaults and General, rendered in jsdom: a custom
 * pass mark and a reminder change count as unsaved changes and save only
 * the changed fields; members who cannot edit get disabled controls; the
 * General tab shows the owners, the single-owner warning and the recent
 * changes, and a logo that is not an image is refused before upload.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const save = vi.fn();
const upload = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/app/w/[slug]/(shell)/settings/actions", () => ({ saveWorkspaceSettingsAction: (...a: unknown[]) => save(...a) }));
vi.mock("@/app/w/[slug]/(shell)/settings/general/actions", () => ({
  checkSlugAction: vi.fn(async () => ({ state: "available", message: "Available." })),
  uploadLogoAction: (...a: unknown[]) => upload(...a),
  removeLogoAction: vi.fn(async () => ({ ok: true })),
}));

import ScreeningDefaults from "@/app/w/[slug]/(shell)/settings/screening-defaults/ScreeningDefaults";
import GeneralSettings from "@/app/w/[slug]/(shell)/settings/general/GeneralSettings";

const initial = {
  defaultTakeHomePassMark: 60,
  defaultAiPassMark: 60,
  defaultInterviewPassMark: 3,
  inviteExpiryDays: 7,
  remindNotStarted: true,
  remindBeforeDeadline: true,
  aiDefaultMinutes: 30,
  keepVoiceAnswers: false,
  interviewerLanguage: "en",
  interviewDefaultMinutes: 60,
  scorecardFirst: true,
  scorecardReminderHours: null,
};

afterEach(() => {
  cleanup();
  save.mockReset();
  upload.mockReset();
});

describe("Screening defaults", () => {
  it("saves a custom take-home pass mark and a reminder change, and nothing else", async () => {
    save.mockResolvedValue({ ok: true, changed: ["defaultTakeHomePassMark", "scorecardReminderHours"], settings: {}, newSlug: null });
    render(<ScreeningDefaults slug="acme" canEdit initial={initial} />);
    expect(screen.queryByText(/unsaved change/)).toBeNull();

    const takeHome = screen.getByRole("radiogroup", { name: "Take-home pass mark" });
    fireEvent.click(takeHome.querySelector('[role="radio"]:last-child')!);
    const field = screen.getByLabelText("Take-home pass mark, custom value");
    fireEvent.change(field, { target: { value: "65" } });
    fireEvent.click(screen.getByRole("radio", { name: "24 hours after" }));
    expect(screen.getByText("2 unsaved changes")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    });
    expect(save).toHaveBeenCalledWith("acme", "screening-defaults", { defaultTakeHomePassMark: 65, scorecardReminderHours: 24 });
    expect(screen.queryByText(/unsaved change/)).toBeNull();
  });

  it("opens Custom for a saved mark that is not a preset, and Discard puts things back", () => {
    render(<ScreeningDefaults slug="acme" canEdit initial={{ ...initial, defaultAiPassMark: 72 }} />);
    expect(screen.getByLabelText("AI screening pass mark, custom value")).toHaveValue(72);
    fireEvent.click(screen.getByRole("switch", { name: "Keep voice answers" }));
    expect(screen.getByText("1 unsaved change")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByRole("switch", { name: "Keep voice answers" })).toHaveAttribute("aria-checked", "false");
  });

  it("shows field errors from the save", async () => {
    save.mockResolvedValue({ ok: false, error: "Check the highlighted settings.", fieldErrors: { defaultInterviewPassMark: "Enter a mark from 1.5 to 4." } });
    render(<ScreeningDefaults slug="acme" canEdit initial={initial} />);
    fireEvent.click(screen.getByRole("radio", { name: "3.5" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a mark from 1.5 to 4.");
  });

  it("is read-only for members who cannot edit", () => {
    render(<ScreeningDefaults slug="acme" canEdit={false} initial={initial} />);
    expect(screen.getByRole("switch", { name: "Keep voice answers" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "14 days" })).toBeDisabled();
  });
});

describe("General", () => {
  const props = {
    slug: "acme",
    workspaceId: "ws1",
    origin: "https://app.example.com",
    now: "2026-09-27T10:00:00.000Z",
    canEdit: true,
    owner: false,
    initial: { name: "Acme", slug: "acme", timezone: "UTC", dateFormat: "DMY" as const, hiringType: "technical" as const },
    logoUrl: null,
    timezones: [
      { value: "UTC", label: "UTC (GMT+0)" },
      { value: "Asia/Kolkata", label: "Asia / Kolkata (GMT+5:30)" },
    ],
    owners: [{ userId: "u1", name: "Priya Shah", email: "priya@acme.com", me: false }],
    recent: [{ id: "a1", title: "Changed take-home pass mark", detail: "From 60 to 70.", actor: "Priya Shah", at: "2026-09-27T09:00:00.000Z", path: "settings/screening-defaults" }],
    canReadAudit: true,
  };

  it("lets admins edit the name but keeps the web address for owners", () => {
    render(<GeneralSettings {...props} />);
    expect(screen.getByLabelText("Workspace name")).not.toBeDisabled();
    expect(screen.getByText("Owners only")).toBeInTheDocument();
    expect(document.getElementById("ws-slug")).toBeDisabled();
  });

  it("shows the date formats in the workspace time zone", () => {
    render(<GeneralSettings {...props} />);
    expect(screen.getByRole("radio", { name: "27 Sep 2026" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Sep 27, 2026" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "2026-09-27" })).toBeInTheDocument();
    expect(screen.getByText("It is 27 Sep 2026 10:00 there now.")).toBeInTheDocument();
  });

  it("lists owners, warns about a single owner, and shows recent changes", () => {
    render(<GeneralSettings {...props} />);
    expect(screen.getByText("Priya Shah", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText(/This workspace has one owner/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Changed take-home pass mark" })).toHaveAttribute("href", "/w/acme/settings/screening-defaults");
    expect(screen.getByRole("link", { name: "See all in the audit log" })).toHaveAttribute("href", "/w/acme/audit?category=settings&range=all");
  });

  it("refuses a file that is not a PNG, JPG or WebP without uploading", () => {
    render(<GeneralSettings {...props} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const svg = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
    fireEvent.change(input, { target: { files: [svg] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Use a PNG, JPG or WebP image.");
    expect(upload).not.toHaveBeenCalled();
  });
});

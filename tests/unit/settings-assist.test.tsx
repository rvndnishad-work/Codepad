import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsForm from "@/app/admin/settings/SettingsForm";

const { updateFns } = vi.hoisted(() => ({
  updateFns: {
    updateNavLinks: vi.fn(),
    updateB2bSettings: vi.fn(),
    updateInterviewArenaSettings: vi.fn(),
    updateMaintenanceSettings: vi.fn(),
    updatePlaygroundAssistSettings: vi.fn(),
  },
}));

vi.mock("@/lib/settings", () => updateFns);

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    initialLinks: [],
    initialB2bSettings: { freeSeatLimit: 3, seatPrice: 49, proctoringEnabled: true },
    initialArenaSettings: {
      showMockToDeveloper: true,
      showScheduleToDeveloper: false,
      showMockToRecruiter: true,
      showScheduleToRecruiter: true,
    },
    initialMaintenance: { enabled: false, message: "" },
    initialAssistSettings: { enabled: true, dailyLimit: 5 },
    ...overrides,
  };
}

beforeEach(() => {
  Object.values(updateFns).forEach((fn) => {
    fn.mockReset();
    fn.mockResolvedValue({});
  });
});

describe("SettingsForm AI Assist tab", () => {
  it("renders the kill switch and quota from initial settings", () => {
    render(<SettingsForm {...baseProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "AI Assist" }));
    expect(
      screen.getByRole("button", { name: "Toggle AI Assist availability" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByLabelText("Free messages per user per day (exact value)"),
    ).toHaveValue(5);
  });

  it("saves the toggled switch and edited quota", async () => {
    render(<SettingsForm {...baseProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "AI Assist" }));

    fireEvent.click(
      screen.getByRole("button", { name: "Toggle AI Assist availability" }),
    );
    fireEvent.change(
      screen.getByLabelText("Free messages per user per day (exact value)"),
      { target: { value: "10" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(updateFns.updatePlaygroundAssistSettings).toHaveBeenCalledTimes(1);
    expect(updateFns.updatePlaygroundAssistSettings).toHaveBeenCalledWith({
      enabled: false,
      dailyLimit: 10,
    });
    expect(
      await screen.findByText("Settings saved successfully!"),
    ).toBeTruthy();
  });
});

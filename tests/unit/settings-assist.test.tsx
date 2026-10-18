import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsForm, { type SettingsTab } from "@/app/admin/settings/SettingsForm";

const { updateFns } = vi.hoisted(() => ({
  updateFns: {
    updateNavLinks: vi.fn(),
    updateInterviewArenaSettings: vi.fn(),
    updatePlaygroundAssistSettings: vi.fn(),
  },
}));

vi.mock("@/lib/settings", () => updateFns);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function baseProps(tab: SettingsTab) {
  return {
    tab,
    initialLinks: [],
    initialArenaSettings: {
      showMockToDeveloper: true,
      showScheduleToDeveloper: false,
      showMockToRecruiter: true,
      showScheduleToRecruiter: true,
    },
    initialAssistSettings: { enabled: true, dailyLimit: 5 },
  };
}

beforeEach(() => {
  Object.values(updateFns).forEach((fn) => {
    fn.mockReset();
    fn.mockResolvedValue({});
  });
});

describe("SettingsForm AI assist tab", () => {
  it("renders the kill switch and quota from initial settings", () => {
    render(<SettingsForm {...baseProps("aiassist")} />);
    expect(screen.getByRole("switch", { name: "AI assist available" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByLabelText("Free messages per user per day")).toHaveValue(5);
    expect(screen.getByRole("link", { name: "Feature switches" })).toHaveAttribute(
      "href",
      "/admin/switches",
    );
  });

  it("saves the toggled switch and edited quota", async () => {
    render(<SettingsForm {...baseProps("aiassist")} />);
    fireEvent.click(screen.getByRole("switch", { name: "AI assist available" }));
    fireEvent.change(screen.getByLabelText("Free messages per user per day"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateFns.updatePlaygroundAssistSettings).toHaveBeenCalledTimes(1);
    expect(updateFns.updatePlaygroundAssistSettings).toHaveBeenCalledWith({
      enabled: false,
      dailyLimit: 10,
    });
    expect(updateFns.updateNavLinks).not.toHaveBeenCalled();
    expect(await screen.findByText("Saved.")).toBeTruthy();
  });
});

describe("SettingsForm interview arena tab", () => {
  it("has a developer schedule toggle and saves it", async () => {
    render(<SettingsForm {...baseProps("arena")} />);
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();

    const toggles = screen.getAllByRole("switch", { name: "Schedule live interviews" });
    expect(toggles).toHaveLength(2);
    expect(toggles[0]).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggles[0]);
    fireEvent.click(save);

    expect(updateFns.updateInterviewArenaSettings).toHaveBeenCalledWith({
      showMockToDeveloper: true,
      showScheduleToDeveloper: true,
      showMockToRecruiter: true,
      showScheduleToRecruiter: true,
    });
    expect(await screen.findByText("Saved.")).toBeTruthy();
  });
});

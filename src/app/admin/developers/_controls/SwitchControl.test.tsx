import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const setDeveloperSwitch = vi.fn();
vi.mock("./actions", () => ({ setDeveloperSwitch: (...a: unknown[]) => setDeveloperSwitch(...a) }));

import SwitchControl from "./SwitchControl";

const base = {
  switchKey: "prompt-arena",
  label: "Prompt arena",
  detail: "Running prompt challenges",
  state: "on" as const,
  message: "The prompt arena is paused.",
  resumeAt: null,
};

describe("SwitchControl", () => {
  beforeEach(() => setDeveloperSwitch.mockReset());

  it("shows the current state as checked and no panel", () => {
    render(<SwitchControl {...base} />);
    expect(screen.getByRole("radio", { name: "On" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("opens an inline confirm panel and requires a note", async () => {
    render(<SwitchControl {...base} />);
    fireEvent.click(screen.getByRole("radio", { name: "Off" }));
    expect(screen.getByText("Set Prompt arena to off?")).toBeInTheDocument();
    expect(screen.getByDisplayValue("The prompt arena is paused.")).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Set to off" });
    expect(confirm).toBeDisabled();
    expect(setDeveloperSwitch).not.toHaveBeenCalled();

    setDeveloperSwitch.mockResolvedValue({ ok: true });
    fireEvent.change(screen.getByPlaceholderText("Why you are changing it"), { target: { value: "Model costs" } });
    fireEvent.click(screen.getByRole("button", { name: "Set to off" }));
    await waitFor(() => expect(setDeveloperSwitch).toHaveBeenCalledTimes(1));
    expect(setDeveloperSwitch.mock.calls[0][0]).toEqual({
      key: "prompt-arena",
      state: "off",
      message: "The prompt arena is paused.",
      resumeAt: null,
      note: "Model costs",
    });
    await waitFor(() => expect(screen.queryByText("Set Prompt arena to off?")).toBeNull());
  });

  it("sends the resume time as ISO and shows a server error", async () => {
    render(<SwitchControl {...base} />);
    fireEvent.click(screen.getByRole("radio", { name: "Read only" }));
    const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2099-01-02T10:30" } });
    fireEvent.change(screen.getByPlaceholderText("Why you are changing it"), { target: { value: "Fixing Piston" } });
    setDeveloperSwitch.mockResolvedValue({ ok: false, error: "Unknown switch." });
    fireEvent.click(screen.getByRole("button", { name: "Set to read only" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Unknown switch."));
    expect(setDeveloperSwitch.mock.calls[0][0].resumeAt).toBe(new Date("2099-01-02T10:30").toISOString());
    // Panel stays open on error.
    expect(screen.getByText("Set Prompt arena to read only?")).toBeInTheDocument();
  });

  it("cancel closes the panel; turning on hides message and resume fields", () => {
    render(<SwitchControl {...base} state="off" />);
    fireEvent.click(screen.getByRole("radio", { name: "On" }));
    expect(document.querySelector("textarea")).toBeNull();
    expect(document.querySelector('input[type="datetime-local"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Set Prompt arena to on?")).toBeNull();
  });
});

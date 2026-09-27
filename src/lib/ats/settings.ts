/**
 * Greenhouse connection settings kept in AtsIntegration.settings (JSON), plus
 * the setup wizard's step list. Pure: safe on client and server.
 */

export type AtsSettings = {
  /** The Greenhouse interview stage the Codepad test sits on, for display. */
  triggerStage: string;
  /** Include the screening score when a result goes back. */
  sendScore: boolean;
  /** Set once the wizard is finished. Until then the detail page opens the wizard. */
  setupComplete: boolean;
  /** Legacy signed-webhook connections (Lever, Ashby) keep their URL here. */
  webhookUrl?: string;
};

export const DEFAULT_SETTINGS: AtsSettings = {
  triggerStage: "",
  sendScore: true,
  setupComplete: false,
};

export function parseAtsSettings(raw: string | null | undefined): AtsSettings {
  let v: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) v = parsed;
  } catch {
    /* defaults */
  }
  return {
    triggerStage: typeof v.triggerStage === "string" ? v.triggerStage.slice(0, 120) : DEFAULT_SETTINGS.triggerStage,
    sendScore: typeof v.sendScore === "boolean" ? v.sendScore : DEFAULT_SETTINGS.sendScore,
    setupComplete: v.setupComplete === true,
    ...(typeof v.webhookUrl === "string" ? { webhookUrl: v.webhookUrl } : {}),
  };
}

export const SETUP_STEPS = [
  { key: "connect", title: "Connect", hint: "Create a key for Greenhouse" },
  { key: "stage", title: "When to import", hint: "The stage that sends the test" },
  { key: "jobs", title: "Map jobs", hint: "Pick a screening for each job" },
  { key: "writeback", title: "What goes back", hint: "Status, score, profile link" },
  { key: "test", title: "Test with one candidate", hint: "Nothing is emailed" },
] as const;

export type SetupStepKey = (typeof SETUP_STEPS)[number]["key"];

export function stepIndex(v: string | null | undefined): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= SETUP_STEPS.length ? n : 1;
}

export type ScreeningKind = "ai" | "takehome" | "none";
export type SendMode = "auto" | "review";

export function cleanScreeningKind(v: unknown): ScreeningKind {
  return v === "ai" || v === "takehome" ? v : "none";
}

export function cleanSendMode(v: unknown): SendMode {
  return v === "review" ? "review" : "auto";
}

export const SCREENING_KIND_LABELS: Record<Exclude<ScreeningKind, "none">, string> = {
  ai: "AI screening",
  takehome: "Take home",
};

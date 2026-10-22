import type { DemoStage } from "@/lib/demo-requests/model";
import type { Tone } from "../interviews/_components/list";

export const STAGE_TONE: Record<DemoStage, Tone> = {
  NEW: "warn",
  CONTACTED: "info",
  DEMO_BOOKED: "info",
  PILOT: "ok",
  CONVERTED: "ok",
  CLOSED: "off",
};

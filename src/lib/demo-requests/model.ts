/**
 * Demo requests: the form's options, validation, and how a request is sized
 * up (Enterprise lead, suggested plan). Pure, so the public form, the API
 * route, the admin pages and tests share one set of rules.
 */
import { z } from "zod";

export const DEMO_STAGES = ["NEW", "CONTACTED", "DEMO_BOOKED", "PILOT", "CONVERTED", "CLOSED"] as const;
export type DemoStage = (typeof DEMO_STAGES)[number];
/** Stages still being worked. */
export const OPEN_STAGES: DemoStage[] = ["NEW", "CONTACTED", "DEMO_BOOKED", "PILOT"];

export const STAGE_LABELS: Record<DemoStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  DEMO_BOOKED: "Demo booked",
  PILOT: "Pilot",
  CONVERTED: "Converted",
  CLOSED: "Closed",
};

export const TEAM_SIZES = [
  { value: "1-3", label: "1 to 3" },
  { value: "4-10", label: "4 to 10" },
  { value: "11-25", label: "11 to 25" },
  { value: "26+", label: "More than 25" },
] as const;

export const MONTHLY_VOLUMES = [
  { value: "under-50", label: "Under 50" },
  { value: "50-200", label: "50 to 200" },
  { value: "200-500", label: "200 to 500" },
  { value: "500+", label: "More than 500" },
] as const;

export const HIRING_TYPES = [
  { value: "technical", label: "Technical roles" },
  { value: "non_technical", label: "Non-technical roles" },
  { value: "both", label: "Both" },
] as const;

export const DEMO_SOURCES = ["pricing", "hire", "direct"] as const;

const values = <T extends readonly { value: string }[]>(opts: T) => opts.map((o) => o.value) as [T[number]["value"], ...T[number]["value"][]];

export const demoRequestSchema = z.object({
  name: z.string().trim().min(1, "Add your name.").max(80),
  email: z.string().trim().toLowerCase().email("Add a valid work email.").max(254),
  company: z.string().trim().min(1, "Add your company.").max(120),
  jobTitle: z.string().trim().max(100).optional().transform((v) => v || undefined),
  teamSize: z.enum(values(TEAM_SIZES), { message: "Pick your team size." }),
  monthlyVolume: z.enum(values(MONTHLY_VOLUMES), { message: "Pick how many candidates you screen." }),
  hiringType: z.enum(values(HIRING_TYPES), { message: "Pick what you hire for." }),
  message: z.string().trim().max(2000).optional().transform((v) => v || undefined),
  source: z.enum(DEMO_SOURCES).optional().default("direct"),
  /** Honeypot: people never see or fill it. */
  website: z.string().max(200).optional(),
});

export type DemoRequestInput = z.infer<typeof demoRequestSchema>;

/** Big enough that sales should talk to them about Enterprise. */
export function isEnterpriseLead(r: { teamSize: string; monthlyVolume: string }): boolean {
  return r.teamSize === "26+" || r.monthlyVolume === "500+";
}

/** The plan that fits their answers, for the admin to start from. */
export function suggestedPlan(r: { teamSize: string; monthlyVolume: string }): "Basic" | "Growth" | "Teams" | "Enterprise" {
  if (isEnterpriseLead(r)) return "Enterprise";
  if (r.teamSize === "11-25" || r.monthlyVolume === "200-500") return "Teams";
  if (r.teamSize === "4-10" || r.monthlyVolume === "50-200") return "Growth";
  return "Basic";
}

export function optionLabel(opts: readonly { value: string; label: string }[], value: string): string {
  return opts.find((o) => o.value === value)?.label ?? value;
}

export function isDemoStage(v: unknown): v is DemoStage {
  return typeof v === "string" && (DEMO_STAGES as readonly string[]).includes(v);
}

/** Workspace address from a company name: "Northwind Labs, Inc." -> "northwind-labs-inc". */
export function slugFromCompany(company: string): string {
  return company
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "pilot";
}

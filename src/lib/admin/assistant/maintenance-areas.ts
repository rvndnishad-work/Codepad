/**
 * Maintenance areas the assistant can schedule: the same registry the proxy
 * and /admin/maintenance use (src/lib/admin/maintenance-rules.ts).
 */
import { AREAS } from "@/lib/admin/maintenance-rules";

export const ASSISTANT_AREAS: { key: string; label: string; paths: string[] }[] = AREAS.map((a) => ({
  key: a.key,
  label: a.label,
  paths: a.paths,
}));

export const AREA_KEYS = ASSISTANT_AREAS.map((a) => a.key);

export function areaLabel(key: string): string {
  return ASSISTANT_AREAS.find((a) => a.key === key)?.label ?? key;
}

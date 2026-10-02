/** UTC day keys (YYYY-MM-DD) and short labels for a window starting at `start`. */
export function dayKeys(start: Date, days: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    out.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    });
  }
  return out;
}

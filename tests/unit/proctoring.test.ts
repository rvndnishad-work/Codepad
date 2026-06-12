import { describe, it, expect } from "vitest";
import { analyzeTelemetry, type TelemetryEvent } from "../../src/lib/proctoring/ai-detection";

/**
 * Verifies the cheat-detection engine that backs the recruiter-page claims
 * ("AI Proctoring & Anti-Cheat": tab switching, clipboard hijacking, keystroke
 * anomalies). These exercise the pure scoring function the telemetry route runs.
 */

// Build a keystroke event helper
const ks = (t: number): TelemetryEvent => ({ t, type: "keystroke", payload: { key: "alphanumeric" } });

describe("analyzeTelemetry — cheat detection engine", () => {
  it("returns a clean score for organic human typing", () => {
    // ~120ms apart with natural jitter -> high std dev, no bursts, no pastes
    const events: TelemetryEvent[] = [];
    let t = 0;
    const jitter = [90, 140, 110, 200, 80, 160, 130, 175, 95, 150, 120, 185, 100, 145, 165];
    for (let i = 0; i < 60; i++) {
      t += jitter[i % jitter.length];
      events.push(ks(t));
    }
    const res = analyzeTelemetry(events, 200);
    expect(res.aiSuspicionScore).toBe(0);
    expect(Object.values(res.signals).every((s) => s === false)).toBe(true);
  });

  it("flags a zero-edit codebase spawn (paste-in answer with no typing)", () => {
    // Large final code, almost no keystrokes, no paste event logged
    const events: TelemetryEvent[] = [ks(100), ks(250), ks(400)];
    const res = analyzeTelemetry(events, 1200);
    expect(res.signals.zeroEditAnswer).toBe(true);
    expect(res.aiSuspicionScore).toBeGreaterThanOrEqual(60);
  });

  it("flags bot-uniform keystroke rhythm (near-zero std dev)", () => {
    // Perfectly even 10ms cadence — impossible for human hands
    const events: TelemetryEvent[] = [];
    for (let i = 1; i <= 40; i++) events.push(ks(i * 10));
    const res = analyzeTelemetry(events, 100);
    expect(res.signals.uniformKeystrokes).toBe(true);
  });

  it("flags streamed-paste typing bursts (>40 chars/sec sustained)", () => {
    // 100 keystrokes inside one second window
    const events: TelemetryEvent[] = [];
    for (let i = 0; i < 100; i++) events.push(ks(1000 + i * 5));
    const res = analyzeTelemetry(events, 500);
    expect(res.signals.streamedPaste).toBe(true);
  });

  it("flags high tab-switch / blur rate", () => {
    const events: TelemetryEvent[] = [];
    for (let i = 0; i < 6; i++) {
      events.push({ t: i * 1000, type: "blur", payload: { timestamp: i * 1000 } });
      events.push({ t: i * 1000 + 200, type: "focus", payload: { timestamp: i * 1000 + 200 } });
    }
    const res = analyzeTelemetry(events, 50);
    expect(res.signals.highBlurRate).toBe(true);
  });

  it("flags idle-then-burst (long silence then large block appears)", () => {
    const events: TelemetryEvent[] = [ks(100)];
    // 90s of silence, then a dense burst
    const base = 90_000;
    for (let i = 0; i < 60; i++) events.push(ks(base + i * 20));
    const res = analyzeTelemetry(events, 400);
    expect(res.signals.idleThenBurst).toBe(true);
  });

  it("caps the suspicion score at 100 when multiple signals fire", () => {
    const events: TelemetryEvent[] = [];
    // uniform + streamed burst + zero-edit-ish, all at once
    for (let i = 0; i < 100; i++) events.push(ks(1000 + i * 10));
    const res = analyzeTelemetry(events, 2000);
    expect(res.aiSuspicionScore).toBeLessThanOrEqual(100);
    expect(res.aiSuspicionScore).toBeGreaterThan(0);
  });

  it("handles empty telemetry without throwing", () => {
    const res = analyzeTelemetry([], 0);
    expect(res.aiSuspicionScore).toBe(0);
    expect(res.details[0]).toMatch(/no telemetry/i);
  });
});

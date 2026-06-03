export type TelemetryEvent = {
  t: number;
  type: "snapshot" | "blur" | "focus" | "paste" | "keystroke";
  payload: any;
};

export interface AIDetectionResult {
  aiSuspicionScore: number;
  signals: {
    uniformKeystrokes: boolean;
    streamedPaste: boolean;
    zeroEditAnswer: boolean;
    idleThenBurst: boolean;
    highBlurRate: boolean;
  };
  details: string[];
}

/**
 * Analyzes candidate telemetry events to compute an AI/automation suspicion score.
 */
export function analyzeTelemetry(events: TelemetryEvent[], finalCodeLength: number = 0): AIDetectionResult {
  const details: string[] = [];
  const signals = {
    uniformKeystrokes: false,
    streamedPaste: false,
    zeroEditAnswer: false,
    idleThenBurst: false,
    highBlurRate: false,
  };

  if (!events || events.length === 0) {
    return { aiSuspicionScore: 0, signals, details: ["No telemetry events logged."] };
  }

  // 1. Extract and Analyze Keystrokes
  const keystrokeEvents = events.filter((e) => e.type === "keystroke");
  const keystrokeCount = keystrokeEvents.length;
  
  // Calculate inter-arrival times
  const interArrivals: number[] = [];
  for (let i = 1; i < keystrokeEvents.length; i++) {
    const diff = keystrokeEvents[i].t - keystrokeEvents[i - 1].t;
    // Discard large gaps (> 2 seconds) which represent pauses
    if (diff < 2000) {
      interArrivals.push(diff);
    }
  }

  // Calculate mean + standard deviation for typing intervals
  let meanInterval = 0;
  let stdDevInterval = 0;
  if (interArrivals.length >= 10) {
    meanInterval = interArrivals.reduce((sum, val) => sum + val, 0) / interArrivals.length;
    const variance = interArrivals.reduce((sum, val) => sum + Math.pow(val - meanInterval, 2), 0) / interArrivals.length;
    stdDevInterval = Math.sqrt(variance);

    // Highly uniform typing (human hands naturally vary. Bots are extremely uniform, often < 15ms standard deviation)
    if (stdDevInterval < 15) {
      signals.uniformKeystrokes = true;
      details.push(`Highly uniform typing rhythm identified (Std Dev: ${stdDevInterval.toFixed(1)}ms). Indicates bot-simulated input.`);
    }
  }

  // 2. Detect Streamed Pastes (>40 chars/sec sustained for >2s)
  // Window analysis: 2-second sliding windows
  let peakSpeed = 0;
  for (let t = 0; t < events[events.length - 1].t; t += 1000) {
    const keysInWindow = keystrokeEvents.filter((e) => e.t >= t && e.t < t + 2000);
    const speed = keysInWindow.length / 2; // chars per second over 2s window
    if (speed > peakSpeed) {
      peakSpeed = speed;
    }
    if (speed > 40) {
      signals.streamedPaste = true;
    }
  }
  if (signals.streamedPaste) {
    details.push(`Automated fast typing burst detected (Peak typing rate: ${peakSpeed.toFixed(1)} chars/sec). Matches AI streaming paste behavior.`);
  }

  // 3. Zero-Edit Answers (large code length, but near-zero alphanumeric keystrokes)
  // If the candidate completed the challenge (final code size is significant, e.g., > 150 characters)
  // but typed less than 30 keystrokes and did not have paste events logged (or bypassed them).
  if (finalCodeLength > 150 && keystrokeCount < 30) {
    // Check if they had a large paste or if code just spawned
    const pasteEvents = events.filter((e) => e.type === "paste");
    if (pasteEvents.length === 0) {
      signals.zeroEditAnswer = true;
      details.push(`Zero-edit codebase spawn: ${finalCodeLength} characters generated with only ${keystrokeCount} interactive keystrokes.`);
    }
  }

  // 4. Idle then Burst Patterns
  // Identify intervals of long inactivity followed by extremely high-speed low-variance typing bursts.
  let lastEventTime = 0;
  for (let i = 0; i < events.length; i++) {
    const elapsed = events[i].t - lastEventTime;
    if (elapsed > 60000) { // Idle for > 60s
      // Check if subsequent 3 seconds contains > 60 alphanumeric keystrokes
      const burstKeys = keystrokeEvents.filter((k) => k.t >= events[i].t && k.t < events[i].t + 3000);
      if (burstKeys.length > 50) {
        signals.idleThenBurst = true;
      }
    }
    lastEventTime = events[i].t;
  }
  if (signals.idleThenBurst) {
    details.push("Idle-then-burst pattern identified: long period of silence followed by instant large-block typing stream.");
  }

  // 5. Blur Analytics
  const blurEvents = events.filter((e) => e.type === "blur");
  const totalBlurCount = blurEvents.length;
  if (totalBlurCount >= 5) {
    signals.highBlurRate = true;
    details.push(`High tab context switching rate: candidate blurred browser tab ${totalBlurCount} times during attempt.`);
  }

  // Heuristic Scoring Matrix
  let score = 0;
  if (signals.zeroEditAnswer) score += 60;
  if (signals.streamedPaste) score += 45;
  if (signals.uniformKeystrokes) score += 35;
  if (signals.idleThenBurst) score += 20;
  if (signals.highBlurRate) score += 15;

  // Cap at 100
  const finalScore = Math.min(100, score);

  return {
    aiSuspicionScore: finalScore,
    signals,
    details,
  };
}

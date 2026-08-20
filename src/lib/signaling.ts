/**
 * Utility for WebRTC signaling server URLs.
 * Resolves URLs from process.env.NEXT_PUBLIC_SIGNALING_URL.
 * Supports comma-separated strings for multiple custom signaling servers.
 */
export function getSignalingUrls(): string[] {
  const envUrl = process.env.NEXT_PUBLIC_SIGNALING_URL;
  if (envUrl) {
    return envUrl
      .split(",")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  }

  // In browser runtime, attempt to infer current origin websocket when port 4444 is used in dev
  if (typeof window !== "undefined" && window.location) {
    const isHttps = window.location.protocol === "https:";
    const protocol = isHttps ? "wss:" : "ws:";
    const host = window.location.hostname;
    
    if (process.env.NODE_ENV === "development") {
      return [
        `${protocol}//${host}:4444`,
        "ws://localhost:4444",
      ];
    }
  }

  // Fallbacks: local development and fallback signaling
  return [
    "ws://localhost:4444",
    "wss://signaling.yjs.dev",
  ];
}


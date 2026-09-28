"use client";

/**
 * Built-in video for the interview room (LiveKit). One call per interview.
 *
 * The provider joins the call when the room opens and leaves when the
 * interview ends or the person clicks Leave (Rejoin brings them back). It
 * turns the camera and mic on only when the person went through the lobby
 * check; otherwise both start off and the buttons ask the browser. The
 * pieces that draw the call (dock, waiting tiles, top bar chip) read it with
 * useCall() and render the LiveKit hooks only while connected.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DisconnectReason, Room, RoomEvent, type LocalParticipant } from "livekit-client";
import { RoomAudioRenderer, RoomContext } from "@livekit/components-react";
import { loadPrefs, mediaErrorMessage, savePrefs } from "./prefs";

export type CallStatus = "off" | "connecting" | "connected" | "left" | "ended" | "error";

type CallCtx = {
  status: CallStatus;
  room: Room | null;
  /** Could not join (the server said no, or the network failed). */
  error: string | null;
  /** A camera, mic or screen share did not start; the call itself is fine. */
  mediaError: string | null;
  clearMediaError: () => void;
  leave: () => void;
  rejoin: () => void;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleScreen: () => Promise<void>;
};

/** The server refused a token; its message is written for people. */
class CallRefused extends Error {}

const Ctx = createContext<CallCtx | null>(null);

/** The call, or null outside a built-in video room. */
export function useCall(): CallCtx | null {
  return useContext(Ctx);
}

async function enableMic(p: LocalParticipant, deviceId: string | null) {
  try {
    await p.setMicrophoneEnabled(true, deviceId ? { deviceId } : undefined);
  } catch (e) {
    // The remembered device may be gone; try the default one before giving up.
    if (!deviceId) throw e;
    await p.setMicrophoneEnabled(true);
  }
}

async function enableCamera(p: LocalParticipant, deviceId: string | null) {
  try {
    await p.setCameraEnabled(true, deviceId ? { deviceId } : undefined);
  } catch (e) {
    if (!deviceId) throw e;
    await p.setCameraEnabled(true);
  }
}

export function VideoCall({ sessionId, enabled, children }: { sessionId: string; enabled: boolean; children: ReactNode }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState<CallStatus>("off");
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [wantIn, setWantIn] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus((s) => (s === "off" || s === "ended" ? s : "off"));
      return;
    }
    if (!wantIn) return;
    let stop = false;
    const r = new Room({ adaptiveStream: true, dynacast: true });
    setStatus("connecting");
    setError(null);

    const onDisconnected = (reason?: DisconnectReason) => {
      if (stop) return;
      roomRef.current = null;
      setRoom(null);
      if (reason === DisconnectReason.ROOM_DELETED) {
        setStatus("ended");
      } else {
        setWantIn(false);
        setStatus("left");
        if (reason !== DisconnectReason.CLIENT_INITIATED) setError("The call dropped. Rejoin when you are ready.");
      }
    };
    const onMediaFailure = (err: unknown) => {
      if (!stop) setMediaError(mediaErrorMessage(err));
    };
    r.on(RoomEvent.Disconnected, onDisconnected);
    r.on(RoomEvent.MediaDevicesError, onMediaFailure);

    (async () => {
      try {
        const res = await fetch(`/api/interview/${encodeURIComponent(sessionId)}/video`, { method: "POST" });
        const j = (await res.json().catch(() => ({}))) as { url?: string; token?: string; error?: unknown };
        if (!res.ok || !j.url || !j.token) throw new CallRefused(typeof j.error === "string" ? j.error : "Could not join the call. Try again in a moment.");
        if (stop) return;
        await r.connect(j.url, j.token);
        if (stop) return void r.disconnect();
        roomRef.current = r;
        setRoom(r);
        setStatus("connected");
        // Same camera and mic as the lobby check. Without a check, both stay
        // off so the browser only asks when the person clicks a button.
        const prefs = loadPrefs();
        if (!prefs.checked) return;
        if (prefs.micOn) await enableMic(r.localParticipant, prefs.micId).catch((e) => !stop && setMediaError(mediaErrorMessage(e, "mic")));
        if (prefs.camOn && !prefs.audioOnly) await enableCamera(r.localParticipant, prefs.camId).catch((e) => !stop && setMediaError(mediaErrorMessage(e, "camera")));
      } catch (e) {
        if (stop) return;
        void r.disconnect();
        setStatus("error");
        setError(e instanceof CallRefused ? e.message : "Could not reach the call. Check your connection, then rejoin.");
      }
    })();

    return () => {
      stop = true;
      r.off(RoomEvent.Disconnected, onDisconnected);
      r.off(RoomEvent.MediaDevicesError, onMediaFailure);
      void r.disconnect();
      roomRef.current = null;
      setRoom(null);
    };
  }, [enabled, wantIn, sessionId, attempt]);

  const leave = useCallback(() => {
    setWantIn(false);
    setError(null);
    setMediaError(null);
    setStatus("left");
  }, []);

  const rejoin = useCallback(() => {
    setWantIn(true);
    setAttempt((a) => a + 1);
  }, []);

  const toggleMic = useCallback(async () => {
    const p = roomRef.current?.localParticipant;
    if (!p) return;
    const on = !p.isMicrophoneEnabled;
    setMediaError(null);
    try {
      if (on) await enableMic(p, loadPrefs().micId);
      else await p.setMicrophoneEnabled(false);
      savePrefs({ micOn: on, checked: true });
    } catch (e) {
      setMediaError(mediaErrorMessage(e, "mic"));
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    const p = roomRef.current?.localParticipant;
    if (!p) return;
    const on = !p.isCameraEnabled;
    setMediaError(null);
    try {
      if (on) await enableCamera(p, loadPrefs().camId);
      else await p.setCameraEnabled(false);
      savePrefs({ camOn: on, audioOnly: on ? false : loadPrefs().audioOnly, checked: true });
    } catch (e) {
      setMediaError(mediaErrorMessage(e, "camera"));
    }
  }, []);

  const toggleScreen = useCallback(async () => {
    const p = roomRef.current?.localParticipant;
    if (!p) return;
    setMediaError(null);
    try {
      await p.setScreenShareEnabled(!p.isScreenShareEnabled, { audio: false });
    } catch (e) {
      // Closing the browser picker is not an error worth showing.
      if (e instanceof Error && e.name === "NotAllowedError") return;
      setMediaError("Screen sharing did not start. Your browser may not support it here.");
    }
  }, []);

  const clearMediaError = useCallback(() => setMediaError(null), []);

  const value = useMemo<CallCtx>(
    () => ({ status, room, error, mediaError, clearMediaError, leave, rejoin, toggleMic, toggleCamera, toggleScreen }),
    [status, room, error, mediaError, clearMediaError, leave, rejoin, toggleMic, toggleCamera, toggleScreen],
  );

  return (
    <Ctx.Provider value={value}>
      {/* Always the same tree, so the room below never remounts when the call connects. */}
      <RoomContext.Provider value={room ?? undefined}>
        {children}
        {room && <RoomAudioRenderer />}
      </RoomContext.Provider>
    </Ctx.Provider>
  );
}

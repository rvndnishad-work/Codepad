"use client";

/**
 * Camera and mic check in the lobby, for interviews on built-in video. The
 * browser is asked for the camera only after "Check camera" (or for the mic
 * only, with "Join with sound only"). The choices are kept in this browser
 * and used when the room joins the call. Plain getUserMedia: no call yet.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { loadPrefs, mediaErrorMessage, savePrefs, type VideoPrefs } from "./prefs";

type Phase = "idle" | "starting" | "live" | "error";

function stopStream(s: MediaStream | null) {
  s?.getTracks().forEach((t) => t.stop());
}

export function LobbyVideo() {
  const [prefs, setPrefs] = useState<VideoPrefs | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [level, setLevel] = useState(0);
  const stream = useRef<MediaStream | null>(null);
  const videoEl = useRef<HTMLVideoElement>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => setPrefs(loadPrefs()), []);

  const update = useCallback((p: Partial<VideoPrefs>) => setPrefs(savePrefs(p)), []);

  const stopMeter = () => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
    void audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
  };

  // Mic level from the live audio track.
  const startMeter = (s: MediaStream) => {
    stopMeter();
    const track = s.getAudioTracks()[0];
    const Ctor = typeof window !== "undefined" ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined;
    if (!track || !Ctor) return;
    try {
      const ctx = new Ctor();
      const src = ctx.createMediaStreamSource(new MediaStream([track]));
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      audioCtx.current = ctx;
      const buf = new Uint8Array(an.fftSize);
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += ((v - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / buf.length);
        setLevel(track.enabled ? Math.min(1, rms * 4) : 0);
        raf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  };

  const listDevices = async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setCams(all.filter((d) => d.kind === "videoinput"));
      setMics(all.filter((d) => d.kind === "audioinput"));
    } catch {}
  };

  /** Starts (or restarts) the preview with the chosen devices. */
  const start = useCallback(
    async (opts: { audioOnly: boolean; camId?: string | null; micId?: string | null }) => {
      const p = loadPrefs();
      const camId = opts.camId !== undefined ? opts.camId : p.camId;
      const micId = opts.micId !== undefined ? opts.micId : p.micId;
      setPhase("starting");
      setError(null);
      stopStream(stream.current);
      stream.current = null;
      stopMeter();
      if (!navigator.mediaDevices?.getUserMedia) {
        setPhase("error");
        setError("This browser cannot use a camera or microphone here. Use a recent Chrome, Edge, Firefox or Safari.");
        return;
      }
      const ask = (exact: boolean) =>
        navigator.mediaDevices.getUserMedia({
          audio: micId && exact ? { deviceId: { exact: micId } } : true,
          video: opts.audioOnly ? false : camId && exact ? { deviceId: { exact: camId } } : true,
        });
      let s: MediaStream;
      try {
        s = await ask(true).catch((e: unknown) => {
          // A remembered device that is gone: fall back to the defaults.
          if (e instanceof Error && (e.name === "OverconstrainedError" || e.name === "NotFoundError") && (camId || micId)) return ask(false);
          throw e;
        });
      } catch (e) {
        setPhase("error");
        setError(mediaErrorMessage(e, opts.audioOnly ? "mic" : "both"));
        return;
      }
      stream.current = s;
      const vt = s.getVideoTracks()[0];
      const at = s.getAudioTracks()[0];
      if (at) at.enabled = loadPrefs().micOn;
      setPrefs(
        savePrefs({
          checked: true,
          audioOnly: opts.audioOnly,
          camOn: opts.audioOnly ? false : true,
          camId: vt?.getSettings().deviceId ?? camId ?? null,
          micId: at?.getSettings().deviceId ?? micId ?? null,
        }),
      );
      if (videoEl.current) videoEl.current.srcObject = vt ? new MediaStream([vt]) : null;
      startMeter(s);
      setPhase("live");
      void listDevices();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Stop the camera when leaving the lobby; the room starts its own.
  useEffect(
    () => () => {
      stopStream(stream.current);
      stopMeter();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const toggleMic = () => {
    const on = !(prefs?.micOn ?? true);
    stream.current?.getAudioTracks().forEach((t) => (t.enabled = on));
    update({ micOn: on });
  };
  const toggleCam = () => {
    const vt = stream.current?.getVideoTracks()[0];
    if (!vt) return void start({ audioOnly: false });
    const on = !(prefs?.camOn ?? true);
    vt.enabled = on;
    update({ camOn: on });
  };

  const audioOnly = prefs?.audioOnly ?? false;
  const camOn = !audioOnly && (prefs?.camOn ?? true);
  const micOn = prefs?.micOn ?? true;
  const live = phase === "live";
  const bars = [0.12, 0.3, 0.5, 0.72];

  return (
    <section aria-label="Camera and mic check" className="grid gap-5 md:grid-cols-2 items-start">
      <div className="flex flex-col gap-3">
        <div className="relative h-[240px] sm:h-[300px] rounded-[20px] bg-panel overflow-hidden flex items-center justify-center">
          <video ref={videoEl} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover [transform:scaleX(-1)] ${live && camOn ? "" : "invisible"}`} />
          {!(live && camOn) && (
            <div className="relative flex flex-col items-center gap-3 px-6 text-center">
              {phase === "starting" ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted" aria-hidden />
              ) : phase === "error" ? (
                <p role="alert" className="text-[14px] text-danger max-w-xs leading-relaxed">
                  {error}
                </p>
              ) : live ? (
                <p className="text-[14px] text-muted">{audioOnly ? "Sound only. Your camera stays off." : "Camera off"}</p>
              ) : (
                <>
                  <Camera className="w-6 h-6 text-subtle" aria-hidden />
                  <p className="text-[14px] text-muted">Your camera preview</p>
                </>
              )}
              {(phase === "idle" || phase === "error") && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => void start({ audioOnly: false })}
                    className="h-10 px-4 rounded-xl bg-secondary text-bg text-[14px] font-semibold inline-flex items-center gap-2 hover:brightness-110"
                  >
                    <Video className="w-4 h-4" aria-hidden /> {phase === "error" ? "Try again" : "Check camera"}
                  </button>
                  <button type="button" onClick={() => void start({ audioOnly: true })} className="h-10 px-4 rounded-xl border border-border-strong text-[14px] font-medium hover:bg-elevated">
                    Join with sound only
                  </button>
                </div>
              )}
            </div>
          )}
          {live && (
            <>
              <span className="absolute left-3.5 top-3.5 h-7 px-2.5 rounded-lg bg-bg/75 text-[12.5px] inline-flex items-center gap-2" aria-label={micOn ? "Microphone level" : "Microphone muted"}>
                Mic
                <span className="flex items-end gap-0.5 h-3" aria-hidden>
                  {bars.map((b, i) => (
                    <span key={i} className={`w-[3px] rounded-sm transition-colors ${micOn && level > b ? "bg-success" : "bg-border-strong"}`} style={{ height: `${5 + i * 2.5}px` }} />
                  ))}
                </span>
              </span>
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2.5">
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-label={micOn ? "Mute" : "Unmute"}
                  aria-pressed={!micOn}
                  className={`w-11 h-11 rounded-full inline-flex items-center justify-center ${micOn ? "bg-bg/70 text-fg hover:bg-bg/90" : "bg-danger/20 text-danger"}`}
                >
                  {micOn ? <Mic className="w-[18px] h-[18px]" aria-hidden /> : <MicOff className="w-[18px] h-[18px]" aria-hidden />}
                </button>
                <button
                  type="button"
                  onClick={toggleCam}
                  aria-label={camOn ? "Turn camera off" : "Turn camera on"}
                  aria-pressed={!camOn}
                  className={`w-11 h-11 rounded-full inline-flex items-center justify-center ${camOn ? "bg-bg/70 text-fg hover:bg-bg/90" : "bg-danger/20 text-danger"}`}
                >
                  {camOn ? <Video className="w-[18px] h-[18px]" aria-hidden /> : <VideoOff className="w-[18px] h-[18px]" aria-hidden />}
                </button>
              </div>
            </>
          )}
        </div>
        {live && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!audioOnly && <DevicePick label="Camera" devices={cams} value={prefs?.camId ?? ""} onPick={(id) => void start({ audioOnly: false, camId: id })} />}
            <DevicePick label="Microphone" devices={mics} value={prefs?.micId ?? ""} onPick={(id) => void start({ audioOnly, micId: id })} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 md:pt-2">
        <h2 className="text-[16px] font-semibold tracking-tight">Camera and mic</h2>
        <p className="text-[14.5px] text-muted leading-relaxed">You will talk on video right here, in your browser. Nothing to install. Check your camera and mic, then go in.</p>
        {live ? (
          <p className="text-[13px] text-success">{audioOnly ? "Your mic works. You will join with sound only." : "All set. The room uses these when you go in."}</p>
        ) : (
          <p className="text-[13px] text-muted">Camera blocked? Your browser asks the first time. You can also join with sound only.</p>
        )}
        {live && audioOnly && (
          <button type="button" onClick={() => void start({ audioOnly: false })} className="self-start text-[13px] font-medium text-secondary-soft hover:underline">
            Use my camera after all
          </button>
        )}
        {live && !audioOnly && (
          <button type="button" onClick={() => void start({ audioOnly: true })} className="self-start text-[13px] font-medium text-secondary-soft hover:underline">
            Join with sound only
          </button>
        )}
      </div>
    </section>
  );
}

function DevicePick({ label, devices, value, onPick }: { label: string; devices: MediaDeviceInfo[]; value: string; onPick: (id: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[13px] text-muted">{label}</span>
      <select value={value} onChange={(e) => onPick(e.target.value)} className="h-10 w-full rounded-[10px] border border-border bg-bg text-fg text-[14px] px-3 truncate">
        {devices.length === 0 && <option value="">Default</option>}
        {devices.map((d, i) => (
          <option key={d.deviceId || i} value={d.deviceId}>
            {d.label || `${label} ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}

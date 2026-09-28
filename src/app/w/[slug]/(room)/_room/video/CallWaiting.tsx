"use client";

/**
 * Before the interview starts, with built-in video: both faces large, so the
 * small talk happens face to face. The call keeps going when the interview
 * starts; it moves to the floating panel.
 */
import { useLocalParticipant } from "@livekit/components-react";
import { useCall } from "./VideoCall";
import { CallControls, CallState, MediaNote, Tile, nameOf, roleOf, useCallPeople } from "./CallParts";

export function CallWaiting({ myRole, title, lead, others }: { myRole: "interviewer" | "candidate"; title: string; lead: string; others: string }) {
  const call = useCall();
  const connected = call?.status === "connected" && !!call.room;
  return (
    <div className="h-full overflow-y-auto flex flex-col items-center justify-center gap-7 p-4 sm:p-8">
      <div className="text-center flex flex-col gap-1.5 max-w-xl">
        <h2 className="text-[24px] sm:text-[26px] font-semibold tracking-[-0.02em] text-balance">{title}</h2>
        <p className="text-[14.5px] text-muted leading-relaxed">{lead}</p>
      </div>
      {connected ? (
        <Stage myRole={myRole} others={others} />
      ) : (
        <div className="w-full max-w-[1040px] min-h-[240px] rounded-[18px] border border-border bg-surface flex items-center justify-center p-6">
          <CallState />
        </div>
      )}
    </div>
  );
}

function Stage({ myRole, others }: { myRole: "interviewer" | "candidate"; others: string }) {
  const { local, main } = useCallPeople(myRole);
  const { isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const role = main ? roleOf(main) : null;
  return (
    <>
      <div className="grid w-full max-w-[1040px] grid-cols-1 md:grid-cols-2 gap-4">
        {main ? (
          <Tile participant={main} preferScreen avatar={112} rounded="rounded-[18px]" label={`${nameOf(main)}${role ? ` · ${role}` : ""}`} className="h-[260px] md:h-[380px]" />
        ) : (
          <div className="h-[260px] md:h-[380px] rounded-[18px] border-2 border-dashed border-border-strong flex flex-col items-center justify-center gap-2 text-center px-6">
            <p className="text-[15px] font-medium">Waiting for {others}</p>
            <p className="text-[13px] text-muted">They join the call as soon as they open the room.</p>
          </div>
        )}
        <Tile participant={local} label="You" avatar={112} rounded="rounded-[18px]" className="h-[260px] md:h-[380px]" />
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2.5">
          <CallControls size="lg" leave={false} settings />
        </div>
        {!isMicrophoneEnabled && !isCameraEnabled && <p className="text-[13px] text-muted">Your camera and mic are off. Turn them on with the buttons above.</p>}
        <MediaNote className="max-w-md" />
      </div>
    </>
  );
}

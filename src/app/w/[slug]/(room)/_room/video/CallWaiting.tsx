"use client";

/**
 * Before the interview starts, with built-in video: both faces large, so the
 * small talk happens face to face. The call keeps going when the interview
 * starts; it moves to the dock.
 */
import type { ReactNode } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { useCall } from "./VideoCall";
import { CallControls, CallState, MediaNote, Tile, nameOf, roleOf, useCallPeople } from "./CallParts";

/** Both tiles side by side at every width; short enough on a phone that the buttons stay on screen. */
const TILE_H = "h-[min(200px,32dvh)] sm:h-[260px] lg:h-[min(380px,48dvh)]";

/**
 * `action` is the screen's main button (Start the interview, for the
 * interviewer), shown under the call buttons.
 */
export function CallWaiting({
  myRole,
  title,
  lead,
  others,
  action,
}: {
  myRole: "interviewer" | "candidate";
  title: string;
  lead: string;
  others: string;
  action?: ReactNode;
}) {
  const call = useCall();
  const connected = call?.status === "connected" && !!call.room;
  return (
    <div className="h-full overflow-y-auto">
      {/* min-h-full on an inner box, not justify-center on the scroller: a tall page then scrolls from its top instead of hiding the title. */}
      <div className="min-h-full flex flex-col items-center justify-center gap-4 sm:gap-7 px-3 py-4 sm:p-8">
        <div className="text-center flex flex-col gap-1 sm:gap-1.5 max-w-xl">
          <h2 className="text-[20px] sm:text-[26px] font-semibold tracking-[-0.02em] leading-snug text-balance">{title}</h2>
          <p className="text-[13.5px] sm:text-[14.5px] text-muted leading-relaxed">{lead}</p>
        </div>
        {connected ? (
          <Stage myRole={myRole} others={others} action={action} />
        ) : (
          <>
            <div className="w-full max-w-[1040px] min-h-[200px] sm:min-h-[240px] rounded-[18px] border border-border bg-surface flex items-center justify-center p-6">
              <CallState />
            </div>
            {action}
          </>
        )}
      </div>
    </div>
  );
}

function Stage({ myRole, others, action }: { myRole: "interviewer" | "candidate"; others: string; action?: ReactNode }) {
  const { local, main } = useCallPeople(myRole);
  const { isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const role = main ? roleOf(main) : null;
  return (
    <>
      <div className="grid w-full max-w-[1040px] grid-cols-2 gap-2 sm:gap-4">
        {main ? (
          <Tile participant={main} preferScreen avatar={72} rounded="rounded-[18px]" label={`${nameOf(main)}${role ? ` · ${role}` : ""}`} className={TILE_H} />
        ) : (
          <div className={`${TILE_H} rounded-[18px] border-2 border-dashed border-border-strong flex flex-col items-center justify-center gap-1.5 text-center px-3 sm:px-6`}>
            <p className="text-[14px] sm:text-[15px] font-medium">Waiting for {others}</p>
            <p className="hidden sm:block text-[13px] text-muted">They join the call as soon as they open the room.</p>
          </div>
        )}
        <Tile participant={local} label="You" avatar={72} rounded="rounded-[18px]" className={TILE_H} />
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2.5">
          <CallControls size="lg" leave={false} settings />
        </div>
        {!isMicrophoneEnabled && !isCameraEnabled && <p className="text-[13px] text-muted text-center">Your camera and mic are off. Turn them on with the buttons above.</p>}
        <MediaNote className="max-w-md" />
        {action}
      </div>
    </>
  );
}

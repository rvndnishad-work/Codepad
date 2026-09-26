/**
 * Full-screen pages for live interviews in a workspace: the lobby and the
 * room. Outside the workspace shell on purpose: candidates and emailed
 * interviewers are not workspace members, and the room needs the whole
 * screen. Each page checks access itself (member, or a room pass cookie).
 */
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return <div className="room-scope min-h-[100dvh] flex flex-col bg-bg text-fg">{children}</div>;
}

/**
 * The guided tour of a workspace: what each stop says and which element it
 * points at (a `data-tour` attribute). Pure, so the copy can be tested; the
 * browser side lives in src/app/w/[slug]/(shell)/workspace-tour.ts.
 */

export type TourTarget = "candidates" | "ai-screening" | "take-homes" | "interviews" | "library" | "credits" | "members" | "tour-start";

export type TourStop = {
  /** null: a centred card that points at nothing. */
  target: TourTarget | null;
  title: string;
  body: string;
};

export type TourOptions = {
  /** AI screening is on this plan; when off, the sidebar link opens Billing. */
  aiScreening: boolean;
  /** The credits card is shown on Overview. */
  hasCredits: boolean;
};

/** Remembered per browser so the tour opens by itself only once per workspace. */
export const tourSeenKey = (slug: string) => `ws_tour_seen:${slug}`;

export function tourStops(o: TourOptions): TourStop[] {
  const stops: TourStop[] = [
    {
      target: null,
      title: "Welcome to your workspace",
      body: "A one-minute look at where things live. Nothing here needs doing right now, and you can replay this tour from Overview at any time.",
    },
    {
      target: "candidates",
      title: "Candidates",
      body: "Everyone you are hiring. Add people one at a time, paste a list from a spreadsheet, or sync them from your ATS. Each candidate moves through stages from Applied to Passed, and every result lands on their page.",
    },
    {
      target: "ai-screening",
      title: "AI screening",
      body: o.aiScreening
        ? "Send a candidate a link and the AI interviewer runs a short screening conversation. You get a scored report on the candidate page. Each screening uses AI credits."
        : "Send a candidate a link and the AI interviewer runs a short screening conversation, with a scored report on the candidate page. Your current plan does not include it, so this link opens Billing.",
    },
    {
      target: "take-homes",
      title: "Take home",
      body: "Pick coding questions and send them as a take home. Candidates solve them in their own time, and submissions come back here for review.",
    },
    {
      target: "interviews",
      title: "Interviews",
      body: "Schedule a live interview in a shared code editor. Interviewers fill in a scorecard, and it is saved with the candidate.",
    },
    {
      target: "library",
      title: "Question library",
      body: "Ready-made questions, plus your own. Reuse them in take homes, interviews and AI screenings.",
    },
  ];
  if (o.hasCredits) {
    stops.push({
      target: "credits",
      title: "AI credits",
      body: "This workspace's own balance. Plan credits arrive each month, and you can buy a top-up here, or move credits in from another workspace, when you need more.",
    });
  }
  stops.push(
    {
      target: "members",
      title: "Members",
      body: "Invite the hiring managers and interviewers you work with, and choose what each person can do.",
    },
    {
      target: "tour-start",
      title: "That is the tour",
      body: "Start wherever suits you. You can replay the tour from here whenever you like.",
    },
  );
  return stops;
}

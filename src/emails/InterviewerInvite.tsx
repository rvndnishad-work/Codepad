/**
 * Interview details for an interviewer who is not a workspace member. HR
 * types their email in the interview wizard; each room in the email has the
 * interviewer's own link (`?guest=<token>`), which opens the interviewer side
 * of that room without an account.
 */
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout, emailStyles } from "./BaseLayout";
import { formatDeadlineUTC } from "./TakeHomeInvite";

export type InterviewerInviteRoom = {
  candidateName: string;
  /** ISO start time; null when no time is set yet. */
  scheduledAt: string | null;
  joinUrl: string;
};

export type InterviewerInviteProps = {
  workspaceName: string;
  inviterName: string;
  title: string;
  formatLabel: string;
  durationMin: number;
  hostName: string;
  rooms: InterviewerInviteRoom[];
  /** Brief for the interviewers, if HR wrote one. */
  brief: string | null;
};

const when = (iso: string | null) => (iso ? formatDeadlineUTC(iso) : "Time to be confirmed");

export function InterviewerInvite({ workspaceName, inviterName, title, formatLabel, durationMin, hostName, rooms, brief }: InterviewerInviteProps) {
  const many = rooms.length > 1;
  return (
    <BaseLayout
      preview={`${inviterName} asked you to interview: ${title}`}
      footer={`${inviterName} at ${workspaceName} added you as an interviewer. Each link is personal to you, so please do not forward it to the candidate.`}
    >
      <Text style={emailStyles.badge("#818cf8")}>Interviewer</Text>
      <Text style={emailStyles.h1}>You are on the panel for {title}.</Text>
      <Text style={emailStyles.body}>
        {inviterName} at {workspaceName} asked you to interview {many ? `${rooms.length} candidates` : rooms[0]?.candidateName || "a candidate"}:{" "}
        <span style={emailStyles.emphasis}>{formatLabel}</span>, about {durationMin} minutes, hosted by {hostName}. The room opens in your browser with the
        interviewer view: the brief, the questions and the scorecard. No account needed.
      </Text>
      {rooms.map((r) => (
        <div key={r.joinUrl} style={{ ...emailStyles.scoreCardOuter, marginBottom: 12 }}>
          <Text style={emailStyles.scoreLabel}>Candidate</Text>
          <Text style={{ ...emailStyles.scoreValue("#F3F4F6"), fontSize: 18 }}>{r.candidateName}</Text>
          <Text style={{ ...emailStyles.scoreLabel, marginTop: 12 }}>When</Text>
          <Text style={{ ...emailStyles.scoreValue("#F3F4F6"), fontSize: 16 }}>{when(r.scheduledAt)}</Text>
          <Button href={r.joinUrl} style={{ ...emailStyles.cta, marginTop: 16 }}>
            Open the interview room
          </Button>
        </div>
      ))}
      {brief && (
        <Text style={emailStyles.body}>
          <span style={emailStyles.emphasis}>Brief from {inviterName}:</span> {brief}
        </Text>
      )}
      <Text style={emailStyles.linkFallback}>
        If a button does not work, paste the link into your browser:
        {rooms.map((r) => (
          <React.Fragment key={r.joinUrl}>
            <br />
            {many ? `${r.candidateName}: ` : ""}
            <a href={r.joinUrl} style={emailStyles.link}>
              {r.joinUrl}
            </a>
          </React.Fragment>
        ))}
      </Text>
    </BaseLayout>
  );
}

export function interviewerInviteText(p: InterviewerInviteProps): string {
  return [
    `${p.inviterName} at ${p.workspaceName} added you as an interviewer for ${p.title}.`,
    `${p.formatLabel}, about ${p.durationMin} minutes, hosted by ${p.hostName}.`,
    "",
    ...p.rooms.flatMap((r) => [`${r.candidateName}: ${when(r.scheduledAt)}`, r.joinUrl, ""]),
    ...(p.brief ? [`Brief: ${p.brief}`, ""] : []),
    "Each link is personal to you and opens the interviewer view. Please do not forward it to the candidate.",
  ].join("\n");
}

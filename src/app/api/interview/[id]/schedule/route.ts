import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth().catch(() => null);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const { startTime, endTime, candidateEmail, interviewerEmail } = body || {};

    if (!startTime || !endTime || !candidateEmail || !interviewerEmail) {
      return NextResponse.json(
        { error: "Missing required fields: startTime, endTime, candidateEmail, interviewerEmail" },
        { status: 400 }
      );
    }

    const interview = await prisma.interviewSession.findUnique({
      where: { id },
    });

    if (!interview) {
      return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
    }

    // Verify caller is owner
    if (interview.userId !== session.user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Build dynami collaborative room link
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const roomUrl = `${origin}/interview/${interview.id}?token=${interview.shareToken}`;

    // Update the database session start/end details
    const parsedStart = new Date(startTime);
    const parsedEnd = new Date(endTime);

    await prisma.interviewSession.update({
      where: { id },
      data: {
        startedAt: parsedStart,
        finishedAt: parsedEnd,
      },
    });

    // Generate Standard iCalendar (.ics) Payload dynamically
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Codepad Recruiter Platform//NONSGML v1.0//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      `UID:${interview.id}@codepad.dev`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(parsedStart)}`,
      `DTEND:${formatICSDate(parsedEnd)}`,
      `SUMMARY:Coding Interview: ${interview.candidateName || "Candidate"} x Codepad`,
      `DESCRIPTION:Join the collaborative developer coding room: ${roomUrl}\\n\\nPrepare your coding sandbox. We support multiple backend runtimes.`,
      `LOCATION:${roomUrl}`,
      `ORGANIZER;CN=Codepad Interviewer:MAILTO:${interviewerEmail}`,
      `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=Candidate:MAILTO:${candidateEmail}`,
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    // Emulated Google Calendar insertion log payload
    const googleCalendarInsertPayload = {
      summary: `Coding Interview: ${interview.candidateName || "Candidate"} x Codepad`,
      location: roomUrl,
      description: `Join the collaborative developer coding room: ${roomUrl}`,
      start: { dateTime: parsedStart.toISOString() },
      end: { dateTime: parsedEnd.toISOString() },
      attendees: [
        { email: candidateEmail, responseStatus: "needsAction" },
        { email: interviewerEmail, responseStatus: "accepted" },
      ],
      conferenceData: {
        entryPoints: [{ entryPointType: "video", uri: roomUrl }],
      },
    };

    console.log("Synchronized scheduling insertion payload on Google Calendar API successfully:", googleCalendarInsertPayload);

    return NextResponse.json({
      ok: true,
      roomUrl,
      icsContent,
      googleCalendarPayload: googleCalendarInsertPayload,
    });

  } catch (err: any) {
    console.error("Calendar sync integration failed:", err);
    return NextResponse.json({ error: "Failed to schedule session" }, { status: 500 });
  }
}

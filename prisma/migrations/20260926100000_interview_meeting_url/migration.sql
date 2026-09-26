-- Video call link (Zoom, Meet, Teams...) for a workspace interview room
ALTER TABLE "InterviewSession" ADD COLUMN "meetingUrl" TEXT;

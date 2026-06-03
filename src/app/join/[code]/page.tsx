import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Resolving Session Code — Interviewpad",
};

interface JoinCodePageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinCodePage({ params }: JoinCodePageProps) {
  const { code } = await params;
  const decodedCode = decodeURIComponent(code).trim();

  if (!decodedCode) {
    redirect("/join");
  }

  // 1. First, attempt to locate the session by its shortCode
  let session = await prisma.interviewSession.findUnique({
    where: { shortCode: decodedCode },
  });

  let isShareToken = true;

  // 1.5. If not found by shortCode, attempt by shareToken
  if (!session) {
    session = await prisma.interviewSession.findUnique({
      where: { shareToken: decodedCode },
    });
  }

  // 2. If not found by shareToken, attempt to look up by primary session ID
  if (!session) {
    session = await prisma.interviewSession.findUnique({
      where: { id: decodedCode },
    });
    isShareToken = false;
  }

  // 3. If session does not exist, redirect back to the form with an invalid error flag
  if (!session) {
    redirect(`/join?error=invalid&code=${encodeURIComponent(decodedCode)}`);
  }

  // 4. EXPIRATION GUARD: If the session has already ended (completed or abandoned), expire the code!
  if (session.status === "completed" || session.status === "abandoned") {
    redirect(`/join?error=expired&code=${encodeURIComponent(decodedCode)}`);
  }

  // 5. Success redirection:
  // If joining as peer via shareToken, append correct token parameter. Otherwise, direct session routing.
  if (isShareToken) {
    redirect(`/interview/${session.id}?token=${session.shareToken}`);
  } else {
    redirect(`/interview/${session.id}`);
  }
}

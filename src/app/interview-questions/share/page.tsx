import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import ShareForm from "./ShareForm";

export const metadata = {
  title: "Share your interview experience — Interviewpad",
  description: "Help other candidates by sharing your real interview experience — company, rounds, questions and tips.",
  alternates: { canonical: "/interview-questions/share" },
};

export default function ShareExperiencePage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/interview-questions" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg transition mb-6">
          <ArrowLeft className="w-4 h-4" /> Interview Questions
        </Link>
        <h1 className="flex items-center gap-2.5 text-2xl sm:text-3xl font-extrabold tracking-tight">
          <Users className="w-6 h-6 text-accent" /> Share your interview experience
        </h1>
        <p className="text-sm text-muted mt-2 mb-7">
          Pay it forward. Your writeup helps the next candidate prepare — it&apos;s reviewed before publishing.
        </p>
        <ShareForm />
      </div>
    </div>
  );
}

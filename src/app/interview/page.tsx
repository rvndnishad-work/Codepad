import { redirect } from "next/navigation";

export const metadata = {
  title: "Mock & Live Interview Sessions — Interviewpad",
};

export default async function InterviewDashboardPage() {
  redirect("/candidate/interview");
}

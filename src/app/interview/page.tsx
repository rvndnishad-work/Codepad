import { redirect } from "next/navigation";

export const metadata = {
  title: "Mock & Live Interview Sessions",
};

export default async function InterviewDashboardPage() {
  redirect("/candidate/interview");
}

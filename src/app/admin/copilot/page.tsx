import { redirect } from "next/navigation";

/** The copilot became the admin assistant. Old links land there. */
export default function CopilotRedirect() {
  redirect("/admin/assistant");
}

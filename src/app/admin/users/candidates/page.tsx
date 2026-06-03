import { redirect } from "next/navigation";

// Back-compat shim. Candidates now live at the bare /admin/users URL since
// the persona toggle makes a separate /candidates path redundant.
export default function AdminCandidatesPage() {
  redirect("/admin/users");
}

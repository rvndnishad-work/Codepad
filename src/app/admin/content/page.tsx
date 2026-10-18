import { redirect } from "next/navigation";

/** Content is a tabbed area whose first tab is the question bank. */
export default function ContentIndex() {
  redirect("/admin/interview-questions");
}

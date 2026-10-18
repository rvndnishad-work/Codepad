import { redirect } from "next/navigation";

/** Comments moved into Community. */
export default function CommentsRedirect() {
  redirect("/admin/community?tab=comments");
}

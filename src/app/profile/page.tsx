import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/profile");
  }

  return (
    <ProfileClient user={session.user} />
  );
}

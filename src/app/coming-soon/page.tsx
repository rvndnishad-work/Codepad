import ComingSoon from "@/components/ComingSoon";

export const metadata = {
  title: "Coming Soon — Interviewpad",
};

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string }>;
}) {
  const { feature } = await searchParams;

  return <ComingSoon feature={feature} />;
}

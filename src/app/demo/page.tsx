import Link from "next/link";
import { auth } from "@/lib/auth";
import { brandForSite } from "@/lib/brand";
import { recruiterUrl } from "@/lib/domains";
import { getSwitch } from "@/lib/admin/switches";
import { DEMO_SOURCES } from "@/lib/demo-requests/model";
import DemoRequestForm from "./DemoRequestForm";

export const metadata = {
  title: "Book a demo",
  description: "See AI screening on your own hiring. Tell us about your team and we will set up a demo and a pilot workspace.",
  alternates: { canonical: recruiterUrl("/demo") },
};

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const sp = await searchParams;
  const source = (DEMO_SOURCES as readonly string[]).includes(sp.source ?? "") ? (sp.source as (typeof DEMO_SOURCES)[number]) : "direct";
  const [session, sw] = await Promise.all([auth().catch(() => null), getSwitch("demo-requests")]);
  const brand = brandForSite("recruiter");
  const paused = sw.state !== "on";

  return (
    <div className="px-4 py-14">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className="ip-label">Book a demo</span>
          <h1 className="ip-display ip-display-md">See {brand.name} on your own hiring</h1>
          <p className="text-[15px] leading-relaxed text-muted">
            Tell us a little about your team. We reply within one working day to fix a time. After the demo we can set up a pilot workspace with
            AI credits so your team can try it on real candidates.
          </p>
        </div>

        {paused ? (
          <div role="status" className="rounded-lg border border-border bg-surface p-5 text-[14px] text-muted">
            {sw.message || "Demo requests are paused for a short while."} You can email{" "}
            <a className="text-fg underline" href="mailto:sales@interviewpad.dev?subject=Demo">sales@interviewpad.dev</a> instead.
          </div>
        ) : (
          <DemoRequestForm source={source} defaultEmail={session?.user?.email ?? ""} defaultName={session?.user?.name ?? ""} />
        )}

        <p className="text-[13px] leading-relaxed text-muted">
          After you send it, you get an email confirming we have it.{" "}
          {session?.user ? (
            <>
              Ready to pay now? <Link className="text-fg underline" href="/pricing">Choose a plan</Link>.
            </>
          ) : (
            <>
              Already have an account? <Link className="text-fg underline" href="/login?next=/pricing">Sign in</Link> and choose a plan instead.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

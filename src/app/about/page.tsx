import Link from "next/link";
import { currentBrand } from "@/lib/current-site";
import { BrandLockup } from "@/components/brand/BrandLogo";

export async function generateMetadata() {
  const brand = await currentBrand();
  return {
    title: `About us — ${brand.name}`,
    description:
      brand.key === "intervutree"
        ? "Intervutree is the hiring runtime: screen, interview, and evaluate developers on proof of craft, not resumes."
        : "DevPrep is where developers practice, learn, and build their way to the next offer.",
  };
}

export default async function AboutPage() {
  const brand = await currentBrand();
  const recruiter = brand.key === "intervutree";

  return (
    <article className="mx-auto max-w-2xl px-4 py-12 text-sm leading-relaxed text-subtle">
      <BrandLockup brand={brand.key} height={48} className="mb-8" />
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-fg">About {brand.name}</h1>
      <p className="mb-8 text-muted">{brand.tagline}</p>

      {recruiter ? (
        <>
          <h2 className="mb-2 mt-6 text-base font-semibold text-fg">Hiring on proof of craft</h2>
          <p>
            Resumes say what someone did. Intervutree shows what they can do. Every applicant gets
            the same take-home or AI screening interview, every attempt runs on our servers, and the
            result is a ranked shortlist with integrity signals attached, ready before your morning
            coffee.
          </p>

          <h2 className="mb-2 mt-6 text-base font-semibold text-fg">One runtime, the whole loop</h2>
          <p>
            Screen at scale with autonomous first-round interviews, run live collaborative interviews
            with full keystroke replay, and manage candidates, pipelines, and team seats in a shared
            workspace. The same sandboxes that developers practice on at DevPrep power every
            assessment here, so candidates meet a familiar, fair environment.
          </p>

          <h2 className="mb-2 mt-6 text-base font-semibold text-fg">Built for teams, open to tools</h2>
          <p>
            Intervutree connects to the ATS you already use and exposes an MCP API so your own
            agents and scripts can create assessments, read results, and move candidates along.
          </p>

          <p className="mt-8">
            <Link href="/features" className="font-semibold text-fg underline decoration-2 underline-offset-4">
              See what is included
            </Link>
            {" · "}
            <Link href="/pricing" className="font-semibold text-fg underline decoration-2 underline-offset-4">
              Pricing
            </Link>
            {" · "}
            <Link href="/docs/mcp" className="font-semibold text-fg underline decoration-2 underline-offset-4">
              Docs
            </Link>
          </p>
        </>
      ) : (
        <>
          <h2 className="mb-2 mt-6 text-base font-semibold text-fg">Practice that looks like the real thing</h2>
          <p>
            DevPrep gives developers runnable challenges, zero-setup playgrounds, curated interview
            questions, and mock interviews with replay, all in the same sandboxes that hiring teams
            use on Intervutree. You practice where you will be interviewed.
          </p>

          <h2 className="mb-2 mt-6 text-base font-semibold text-fg">Learn from people who have been there</h2>
          <p>
            Prep journeys turn a target role into a study plan, and vetted creators publish
            tutorials and real interview loops you can work through at your own pace.
          </p>

          <p className="mt-8">
            <Link href="/playgrounds" className="font-semibold text-fg underline decoration-2 underline-offset-4">
              Open a playground
            </Link>
            {" · "}
            <Link href="/interview-questions" className="font-semibold text-fg underline decoration-2 underline-offset-4">
              Interview questions
            </Link>
          </p>
        </>
      )}

      {recruiter && (
        <p className="mt-10 text-muted">
          Questions? Write to{" "}
          <a href="mailto:sales@interviewpad.dev" className="text-fg underline underline-offset-4">
            sales@interviewpad.dev
          </a>
          .
        </p>
      )}
    </article>
  );
}

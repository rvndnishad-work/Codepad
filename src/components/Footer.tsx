import Link from "next/link";
import { LogoLockup } from "./Logo";

/**
 * The colophon.
 *
 * Footers are where template aesthetics go to die — four identical link
 * columns, a bordered "SOC2" card, three rounded social buttons. This one is
 * set as the back matter of a technical document: a brand statement in the
 * editorial column, ruled link columns, and a monospaced RUNTIME STRIP that
 * states the platform's actual guarantees as metadata rather than as badges.
 */

const PRODUCT_LINKS = [
  { href: "/playgrounds", label: "Playgrounds" },
  { href: "/challenges", label: "Challenges" },
  { href: "/explore", label: "Explore" },
  { href: "/play", label: "New sandbox" },
];

const PREPARE_LINKS = [
  { href: "/interview-questions", label: "Interview questions" },
  { href: "/prep", label: "Prep journeys" },
  { href: "/creators", label: "Creators" },
  { href: "/blog", label: "Blog" },
];

const HIRING_LINKS = [
  { href: "/hire", label: "For hiring teams" },
  { href: "/pricing", label: "Pricing" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/become-creator", label: "Become a creator" },
];

/** Every claim here maps to a shipped mechanism — keep it that way. */
const RUNTIME_FACTS = [
  "Network-isolated execution",
  "Server-side grading",
  "AES-256 secrets at rest",
  "Append-only audit trails",
  "SOC 2 in progress",
  "GDPR compliant",
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg">
      <div className="mx-auto max-w-7xl px-4">
        {/* ── Editorial column + ruled link columns ── */}
        <div className="grid grid-cols-1 gap-12 border-b border-border py-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5 lg:pr-12">
            <Link href="/" className="inline-flex">
              <LogoLockup height={44} />
            </Link>
            <p className="mt-6 max-w-sm text-[13.5px] leading-relaxed text-muted">
              An interview runtime. Candidates practise on the same
              network-isolated sandbox that hiring teams grade on, so what
              happens in preparation and what happens in the room are the
              same system.
            </p>
            <div className="mt-7 flex items-center gap-5">
              {[
                { label: "GitHub", href: "#" },
                { label: "X", href: "#" },
                { label: "YouTube", href: "#" },
              ].map((s) => (
                <a key={s.label} href={s.href} className="ip-link ip-label">
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
            <FooterColumn title="Build" links={PRODUCT_LINKS} />
            <FooterColumn title="Prepare" links={PREPARE_LINKS} />
            <FooterColumn title="Hire" links={HIRING_LINKS} />
          </nav>
        </div>

        {/* ── Runtime strip: the guarantees, as metadata ── */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border py-4">
          <span className="ip-label ip-label-accent flex items-center gap-2">
            <span className="ip-live h-[5px] w-[5px] bg-accent" aria-hidden />
            Runtime
          </span>
          {RUNTIME_FACTS.map((fact) => (
            <span key={fact} className="ip-label">
              {fact}
            </span>
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div className="flex flex-col items-start justify-between gap-3 py-6 sm:flex-row sm:items-center">
          <span className="ip-label">
            © {new Date().getFullYear()} Interviewpad
          </span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="ip-label hover:text-fg">
              Privacy
            </Link>
            <Link href="/terms" className="ip-label hover:text-fg">
              Terms
            </Link>
            <Link href="/docs" className="ip-label hover:text-fg">
              Docs
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border pb-2.5">
        <span className="ip-label ip-label-fg">{title}</span>
      </div>
      <ul className="mt-3.5 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-[13px] text-muted transition-colors hover:text-fg"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

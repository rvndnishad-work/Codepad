export const metadata = { title: "Terms — Codepad" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 prose prose-invert text-sm text-subtle leading-relaxed">
      <h1 className="text-2xl font-semibold tracking-tight text-fg mb-2">
        Terms of use
      </h1>
      <p className="text-muted mb-6">Last updated: 2026</p>

      <h2 className="text-base font-semibold text-fg mt-6 mb-2">
        Use of the service
      </h2>
      <p>
        Codepad is provided as-is for writing, running, and sharing
        JavaScript code. By using the service, you agree not to use it for
        anything illegal, abusive, or that violates someone else&apos;s rights.
      </p>

      <h2 className="text-base font-semibold text-fg mt-6 mb-2">Your content</h2>
      <p>
        You retain ownership of code you write. When you mark a snippet
        public you grant other users the right to view and fork it. You are
        responsible for not posting confidential, private, or infringing
        content.
      </p>

      <h2 className="text-base font-semibold text-fg mt-6 mb-2">Limitations</h2>
      <p>
        While Codepad is in beta, snippet quotas, file size limits, and rate
        limits may change without notice. The service is provided without
        warranty of uptime, durability, or fitness for a particular purpose.
      </p>

      <h2 className="text-base font-semibold text-fg mt-6 mb-2">Termination</h2>
      <p>
        We may suspend accounts that abuse the service. You may stop using
        Codepad at any time and delete your snippets from the dashboard.
      </p>
    </article>
  );
}

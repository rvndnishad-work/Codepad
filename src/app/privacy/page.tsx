export const metadata = { title: "Privacy — Codepad" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 prose prose-invert text-sm text-subtle leading-relaxed">
      <h1 className="text-2xl font-semibold tracking-tight text-fg mb-2">
        Privacy
      </h1>
      <p className="text-muted mb-6">Last updated: 2026</p>

      <h2 className="text-base font-semibold text-fg mt-6 mb-2">
        What we store
      </h2>
      <p>
        When you sign in with GitHub we store your GitHub user id, name,
        avatar URL, and email solely to identify your account and display your
        snippets back to you.
      </p>
      <p>
        Your snippet code, title, tags, and visibility setting are stored in
        our database under your account. Public snippets are visible to anyone
        with the link.
      </p>

      <h2 className="text-base font-semibold text-fg mt-6 mb-2">
        What we don&apos;t do
      </h2>
      <p>
        Your code never executes on our servers — it runs entirely in a
        sandboxed iframe in your browser. We don&apos;t sell or share your data
        with third parties. We don&apos;t serve ads.
      </p>

      <h2 className="text-base font-semibold text-fg mt-6 mb-2">
        Cookies
      </h2>
      <p>
        We use a single session cookie (set by NextAuth) to keep you signed
        in. No analytics or tracking cookies.
      </p>

      <h2 className="text-base font-semibold text-fg mt-6 mb-2">
        Deleting your data
      </h2>
      <p>
        You can delete any snippet from your dashboard. To delete your
        account and all associated snippets, contact us.
      </p>
    </article>
  );
}

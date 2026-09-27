import { prisma } from "@/lib/prisma";
import { replyToTokenFresh } from "@/lib/workspace/candidate-experience";
import EmailLinkCard, { primaryBtn } from "../../EmailLinkCard";
import { confirmReplyToAction } from "../../actions";

export const metadata = { title: "Confirm reply-to address · Interviewpad", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ state?: string }>;
};

/**
 * Landing page for the reply-to confirmation email. Confirming needs a
 * button press so a mail scanner opening the link does not confirm it.
 */
export default async function ConfirmReplyToPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { state } = await searchParams;

  if (state === "done") {
    return (
      <EmailLinkCard title="Address confirmed">
        <p>Replies from candidates now come to this inbox. You can close this tab.</p>
      </EmailLinkCard>
    );
  }

  const ws =
    token.length <= 200
      ? await prisma.workspace.findUnique({ where: { replyToToken: token }, select: { name: true, replyToEmail: true } })
      : null;

  if (!ws?.replyToEmail || state === "invalid") {
    return (
      <EmailLinkCard title="This link does not work">
        <p>It may have been used already, or a newer confirmation email replaced it. Ask the workspace admin to send a new one from Settings.</p>
      </EmailLinkCard>
    );
  }
  if (!replyToTokenFresh(token) || state === "expired") {
    return (
      <EmailLinkCard title="This link has expired">
        <p>Ask the workspace admin to send a new confirmation email from Settings.</p>
      </EmailLinkCard>
    );
  }

  return (
    <EmailLinkCard title="Confirm this reply-to address">
      <p>
        When candidates of <span className="text-fg font-medium">{ws.name}</span> reply to an email from Interviewpad, the reply will go to{" "}
        <span className="text-fg font-medium break-all">{ws.replyToEmail}</span>.
      </p>
      <form action={confirmReplyToAction}>
        <input type="hidden" name="token" value={token} />
        <button type="submit" className={primaryBtn}>
          Confirm this address
        </button>
      </form>
      <p className="text-xs text-subtle">If you did not expect this, close this tab and nothing changes.</p>
    </EmailLinkCard>
  );
}

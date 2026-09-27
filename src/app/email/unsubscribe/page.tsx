import { verifyUnsubscribe } from "@/lib/email-unsubscribe";
import EmailLinkCard, { primaryBtn } from "../EmailLinkCard";
import { unsubscribeAction } from "../actions";

export const metadata = { title: "Unsubscribe · Interviewpad", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ e?: string; s?: string; state?: string; sample?: string }> };

/**
 * Unsubscribe from candidate emails. The link in every candidate email
 * lands here; the address is only added to the suppression list after the
 * button is pressed.
 */
export default async function UnsubscribePage({ searchParams }: Props) {
  const { e = "", s = "", state, sample } = await searchParams;

  if (sample) {
    return (
      <EmailLinkCard title="This is a sample link">
        <p>Candidates get their own unsubscribe link in every email. This one came from a preview or a test email, so it does nothing.</p>
      </EmailLinkCard>
    );
  }
  if (state === "done") {
    return (
      <EmailLinkCard title="You are unsubscribed">
        <p>
          We will not send more emails to <span className="text-fg font-medium break-all">{e}</span>. If a team still needs to reach you about an
          application, they will contact you another way.
        </p>
      </EmailLinkCard>
    );
  }
  if (state === "busy") {
    return (
      <EmailLinkCard title="Try again later">
        <p>We could not handle that just now. Wait a few minutes and try again.</p>
      </EmailLinkCard>
    );
  }
  const email = e.trim().toLowerCase();
  if (!email || !verifyUnsubscribe(email, s) || state === "invalid") {
    return (
      <EmailLinkCard title="This link does not work">
        <p>It may have been copied only in part. Open the unsubscribe link from the email again.</p>
      </EmailLinkCard>
    );
  }

  return (
    <EmailLinkCard title="Stop these emails?">
      <p>
        We will stop sending invites, reminders and updates about screenings to{" "}
        <span className="text-fg font-medium break-all">{email}</span>, from every team that uses Interviewpad.
      </p>
      <form action={unsubscribeAction}>
        <input type="hidden" name="e" value={email} />
        <input type="hidden" name="s" value={s} />
        <button type="submit" className={primaryBtn}>
          Unsubscribe
        </button>
      </form>
      <p className="text-xs text-subtle">Changed your mind? Close this tab and nothing changes.</p>
    </EmailLinkCard>
  );
}

/**
 * PII masking for assistant tool results. Emails go back to the model masked
 * ("ja***@ex***.com") unless the admin asked for the field (reveal=true), so
 * they are not echoed into chat history by accident.
 */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  const keep = (s: string, n: number) => (s.length <= n ? s.slice(0, 1) : s.slice(0, n));
  return `${keep(local, 2)}***@${keep(host, 2)}***${tld}`;
}

export function emailOut(email: string | null | undefined, reveal: boolean): string | null {
  return reveal ? email ?? null : maskEmail(email);
}

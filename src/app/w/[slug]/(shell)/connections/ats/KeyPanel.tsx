"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Eye, RefreshCw } from "lucide-react";
import { revealPartnerKeyAction, rotatePartnerKeyAction } from "../actions";
import { btn, btnSm, copyText } from "../ui";

/** The Greenhouse partner key and the endpoint address, with reveal, copy and replace. */
export default function KeyPanel({ slug, baseUrl, freshKey, canManage }: { slug: string; baseUrl: string; freshKey?: string | null; canManage: boolean }) {
  const router = useRouter();
  const [key, setKey] = useState<string | null>(freshKey ?? null);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [busy, start] = useTransition();

  const reveal = () =>
    start(async () => {
      const r = await revealPartnerKeyAction(slug);
      if (r.ok) setKey(r.key);
      else toast.error(r.error);
    });
  const rotate = () =>
    start(async () => {
      const r = await rotatePartnerKeyAction(slug);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setKey(r.key);
      setConfirmRotate(false);
      toast.success("New key created. Paste it into Greenhouse; the old one stops working now.");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted">API key for Greenhouse</span>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 min-w-[240px] rounded-lg border border-border bg-panel px-3 py-2 font-mono text-[13px] text-fg break-all">
            {key ?? "Hidden. Reveal it to copy."}
          </code>
          {key ? (
            <button type="button" className={btnSm} onClick={() => copyText(key, toast)}>
              <Copy className="w-3.5 h-3.5" aria-hidden /> Copy
            </button>
          ) : (
            canManage && (
              <button type="button" className={btnSm} onClick={reveal} disabled={busy}>
                <Eye className="w-3.5 h-3.5" aria-hidden /> Reveal
              </button>
            )
          )}
        </div>
        <span className="text-[13px] text-muted">Greenhouse sends it as the user name with an empty password. Treat it like a password.</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted">Endpoint address</span>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 min-w-[240px] rounded-lg border border-border bg-panel px-3 py-2 font-mono text-[13px] text-fg break-all">{baseUrl}</code>
          <button type="button" className={btnSm} onClick={() => copyText(baseUrl, toast)}>
            <Copy className="w-3.5 h-3.5" aria-hidden /> Copy
          </button>
        </div>
        <span className="text-[13px] text-muted">Greenhouse calls list_tests, send_test, test_status and request_errors under this address.</span>
      </div>

      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          {confirmRotate ? (
            <>
              <span className="text-[13px] text-fg">The current key stops working at once. Replace it?</span>
              <button type="button" className={btn} onClick={rotate} disabled={busy}>
                Replace key
              </button>
              <button type="button" className={btn} onClick={() => setConfirmRotate(false)}>
                Keep it
              </button>
            </>
          ) : (
            <button type="button" className={btn} onClick={() => setConfirmRotate(true)}>
              <RefreshCw className="w-4 h-4" aria-hidden /> Replace key
            </button>
          )}
        </div>
      )}
    </div>
  );
}

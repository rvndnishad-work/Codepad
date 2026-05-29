"use client";

import { useState, useTransition } from "react";
import {
  Plug,
  KeyRound,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  ShieldCheck,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveAtsIntegrationAction,
  disconnectAtsIntegrationAction,
  sendAtsTestEventAction,
  type AtsIntegrationView,
  type AtsProvider,
  type AtsTestResult,
} from "./actions";

type Props = {
  slug: string;
  workspaceName: string;
  planName: string;
  planAllowed: boolean;
  isAdmin: boolean;
  initialView: AtsIntegrationView;
};

const PROVIDERS: { id: AtsProvider; label: string; sampleUrl: string; brand: string }[] = [
  { id: "greenhouse", label: "Greenhouse", sampleUrl: "https://api.greenhouse.io/v1/...", brand: "text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]" },
  { id: "lever", label: "Lever", sampleUrl: "https://api.lever.co/v1/...", brand: "text-indigo-400 border-indigo-500/25 bg-indigo-500/[0.06]" },
  { id: "ashby", label: "Ashby", sampleUrl: "https://api.ashbyhq.com/v1/...", brand: "text-fuchsia-400 border-fuchsia-500/25 bg-fuchsia-500/[0.06]" },
];

export default function AtsIntegrationClient({
  slug,
  workspaceName,
  planName,
  planAllowed,
  isAdmin,
  initialView,
}: Props) {
  const [view, setView] = useState(initialView);
  const [provider, setProvider] = useState<AtsProvider>(initialView?.provider ?? "greenhouse");
  const [webhookUrl, setWebhookUrl] = useState(initialView?.webhookUrl ?? "");
  const [apiKeyMode, setApiKeyMode] = useState<"keep" | "replace">(initialView ? "keep" : "replace");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [secretMode, setSecretMode] = useState<"keep" | "replace" | "clear">("keep");
  const [secretInput, setSecretInput] = useState("");
  const [testResult, setTestResult] = useState<AtsTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [savePending, startSave] = useTransition();
  const [disconnectPending, startDisconnect] = useTransition();

  const isConnected = !!view;

  if (!planAllowed) {
    return <PlanLockedCard planName={planName} />;
  }

  function reset(updated: AtsIntegrationView) {
    setView(updated);
    setProvider(updated?.provider ?? provider);
    setWebhookUrl(updated?.webhookUrl ?? "");
    setApiKeyMode("keep");
    setApiKeyInput("");
    setSecretMode("keep");
    setSecretInput("");
  }

  async function onSave() {
    if (!isAdmin) {
      toast.error("Only workspace owners/admins can manage ATS integrations.");
      return;
    }
    startSave(async () => {
      try {
        const payload: Parameters<typeof saveAtsIntegrationAction>[1] = {
          provider,
          webhookUrl,
        };
        if (apiKeyMode === "replace") payload.apiKey = apiKeyInput;
        if (secretMode === "replace") payload.webhookSecret = secretInput;
        else if (secretMode === "clear") payload.webhookSecret = "";

        await saveAtsIntegrationAction(slug, payload);
        toast.success(isConnected ? "ATS integration updated" : "ATS integration connected");
        // Optimistic local reflection — we know the webhookUrl + which fields changed.
        const next: AtsIntegrationView = {
          provider,
          webhookUrl: webhookUrl.trim(),
          hasApiKey: apiKeyMode === "replace" ? true : view?.hasApiKey ?? true,
          hasWebhookSecret:
            secretMode === "replace"
              ? true
              : secretMode === "clear"
                ? false
                : view?.hasWebhookSecret ?? false,
          createdAt: view?.createdAt ?? new Date().toISOString(),
        };
        reset(next);
      } catch (err) {
        toast.error((err as Error)?.message ?? "Failed to save ATS integration");
      }
    });
  }

  async function onTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await sendAtsTestEventAction(slug);
      setTestResult(result);
      if (result.ok) {
        const ok = result.httpStatus >= 200 && result.httpStatus < 300;
        if (ok) toast.success(`Test event accepted (HTTP ${result.httpStatus})`);
        else toast.message(`Reached ATS, got HTTP ${result.httpStatus}`);
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error((err as Error)?.message ?? "Test event failed");
    } finally {
      setTesting(false);
    }
  }

  async function onDisconnect() {
    if (!isAdmin) {
      toast.error("Only workspace owners/admins can disconnect.");
      return;
    }
    if (!confirm("Disconnect this ATS integration? Saved credentials will be deleted.")) return;
    startDisconnect(async () => {
      try {
        await disconnectAtsIntegrationAction(slug);
        toast.success("ATS integration disconnected");
        setTestResult(null);
        reset(null);
      } catch (err) {
        toast.error((err as Error)?.message ?? "Failed to disconnect");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/70">
          <Plug className="w-3.5 h-3.5" />
          Workspace integrations
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">ATS Webhooks</h1>
        <p className="text-sm text-muted max-w-2xl leading-relaxed">
          Push graded candidate verdicts from <span className="text-fg font-medium">{workspaceName}</span> into
          your ATS automatically. One integration per workspace; credentials are encrypted at rest.
        </p>
      </header>

      {!isAdmin && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-fg">
            View-only access. Only workspace <span className="font-semibold">Owners</span> and{" "}
            <span className="font-semibold">Admins</span> can connect or modify the ATS integration.
          </div>
        </div>
      )}

      {/* Status panel when connected */}
      {isConnected && view && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-fg">
                Connected to <span className="capitalize">{view.provider}</span>
              </div>
              <div className="text-[11px] text-muted truncate font-mono">{view.webhookUrl}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onTest}
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-fg border border-border bg-panel/40 hover:bg-panel disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Send test event
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={onDisconnect}
                disabled={disconnectPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold text-rose-300 border border-rose-500/30 bg-rose-500/[0.06] hover:bg-rose-500/[0.12] disabled:opacity-50"
              >
                {disconnectPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}

      {/* Test event result */}
      {testResult && (
        <div
          className={`rounded-xl border px-4 py-3 space-y-2 ${
            testResult.ok && testResult.httpStatus >= 200 && testResult.httpStatus < 300
              ? "border-emerald-500/25 bg-emerald-500/[0.04]"
              : testResult.ok
                ? "border-amber-500/25 bg-amber-500/[0.04]"
                : "border-rose-500/25 bg-rose-500/[0.04]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-semibold flex items-center gap-1.5">
              {testResult.ok ? (
                testResult.httpStatus >= 200 && testResult.httpStatus < 300 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-amber-400" />
                )
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span className="text-fg">
                {testResult.ok
                  ? `HTTP ${testResult.httpStatus}`
                  : "Request failed"}
              </span>
              {testResult.ok && (
                <span className="font-mono text-muted/80">· {testResult.durationMs}ms</span>
              )}
              {!testResult.ok && testResult.durationMs !== undefined && (
                <span className="font-mono text-muted/80">· {testResult.durationMs}ms</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setTestResult(null)}
              className="text-[10px] text-muted/70 hover:text-fg"
            >
              Dismiss
            </button>
          </div>
          {testResult.ok ? (
            <pre className="text-[10px] font-mono text-muted/90 bg-bg/40 border border-border/40 rounded-md p-2 max-h-32 overflow-auto whitespace-pre-wrap break-all">
              {testResult.body || "(empty body)"}
            </pre>
          ) : (
            <div className="text-[11px] font-mono text-rose-300">{testResult.error}</div>
          )}
        </div>
      )}

      {/* Form */}
      <fieldset
        disabled={!isAdmin || savePending}
        className="rounded-xl border border-border bg-surface/60 p-5 space-y-5"
      >
        {/* Provider picker */}
        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted/70 block">
            Provider
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PROVIDERS.map((p) => {
              const active = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={`px-3 py-2 rounded-md border text-xs font-semibold transition ${
                    active
                      ? "border-fg text-fg bg-panel/60"
                      : "border-border text-muted hover:text-fg hover:bg-panel/30"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Webhook URL */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted/70 block">
            Webhook URL
          </label>
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder={PROVIDERS.find((p) => p.id === provider)?.sampleUrl}
            className="w-full pl-3 pr-4 py-2 bg-bg border border-border rounded-md text-xs font-mono text-fg/90 focus:outline-none focus:border-fg placeholder:text-muted/40"
          />
          <p className="text-[10px] text-muted/70">
            Where we POST candidate verdicts. Must be HTTPS in production; private/internal hosts are rejected.
          </p>
        </div>

        {/* API key */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted/70 flex items-center gap-1.5">
            <KeyRound className="w-3 h-3" /> API Key
            <span className="text-muted/50 font-normal normal-case tracking-normal ml-1">
              (sent as <code className="text-muted">Authorization: Bearer ...</code>)
            </span>
          </label>
          {apiKeyMode === "replace" ? (
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={isConnected ? "Paste new API key" : "Paste your API key"}
                autoComplete="off"
                className="flex-1 pl-3 pr-4 py-2 bg-bg border border-border rounded-md text-xs font-mono text-fg/90 focus:outline-none focus:border-fg placeholder:text-muted/40"
              />
              {isConnected && (
                <button
                  type="button"
                  onClick={() => {
                    setApiKeyMode("keep");
                    setApiKeyInput("");
                  }}
                  className="px-3 py-2 rounded-md text-[11px] font-semibold text-muted border border-border hover:bg-panel/40"
                >
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-bg/30 border border-dashed border-border/60 rounded-md text-[11px] font-mono text-muted/70">
                {view?.hasApiKey ? "•••••••••••• (stored, encrypted)" : "Not set"}
              </div>
              <button
                type="button"
                onClick={() => setApiKeyMode("replace")}
                className="px-3 py-2 rounded-md text-[11px] font-semibold text-fg border border-border bg-panel/40 hover:bg-panel"
              >
                Replace
              </button>
            </div>
          )}
        </div>

        {/* Webhook secret (optional) */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted/70 flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Webhook Signing Secret
            <span className="text-muted/50 font-normal normal-case tracking-normal ml-1">
              (optional · for verifying inbound webhooks from your ATS)
            </span>
          </label>
          {secretMode === "replace" ? (
            <div className="flex gap-2">
              <input
                type="password"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                placeholder="Paste signing secret"
                autoComplete="off"
                className="flex-1 pl-3 pr-4 py-2 bg-bg border border-border rounded-md text-xs font-mono text-fg/90 focus:outline-none focus:border-fg placeholder:text-muted/40"
              />
              <button
                type="button"
                onClick={() => {
                  setSecretMode("keep");
                  setSecretInput("");
                }}
                className="px-3 py-2 rounded-md text-[11px] font-semibold text-muted border border-border hover:bg-panel/40"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-bg/30 border border-dashed border-border/60 rounded-md text-[11px] font-mono text-muted/70">
                {secretMode === "clear"
                  ? "Will be cleared on save"
                  : view?.hasWebhookSecret
                    ? "•••••••••••• (stored, encrypted)"
                    : "Not set"}
              </div>
              <button
                type="button"
                onClick={() => setSecretMode("replace")}
                className="px-3 py-2 rounded-md text-[11px] font-semibold text-fg border border-border bg-panel/40 hover:bg-panel"
              >
                {view?.hasWebhookSecret ? "Replace" : "Set"}
              </button>
              {view?.hasWebhookSecret && secretMode !== "clear" && (
                <button
                  type="button"
                  onClick={() => setSecretMode("clear")}
                  className="px-3 py-2 rounded-md text-[11px] font-semibold text-rose-300 border border-rose-500/30 bg-rose-500/[0.06] hover:bg-rose-500/[0.12]"
                >
                  Clear
                </button>
              )}
              {secretMode === "clear" && (
                <button
                  type="button"
                  onClick={() => setSecretMode("keep")}
                  className="px-3 py-2 rounded-md text-[11px] font-semibold text-muted border border-border hover:bg-panel/40"
                >
                  Undo
                </button>
              )}
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex items-center justify-end pt-3 border-t border-border">
          <button
            type="button"
            onClick={onSave}
            disabled={savePending || !isAdmin}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-fg text-bg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {savePending && <Loader2 className="w-3 h-3 animate-spin" />}
            {isConnected ? "Save changes" : "Connect ATS"}
          </button>
        </div>
      </fieldset>
    </div>
  );
}

function PlanLockedCard({ planName }: { planName: string }) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/70">
          <Plug className="w-3.5 h-3.5" />
          Workspace integrations
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">ATS Webhooks</h1>
      </header>
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold text-fg">ATS sync is on Growth & Enterprise plans</div>
          <p className="text-xs text-muted leading-relaxed">
            Your current plan ({planName}) doesn't include ATS integrations. Upgrade to push verdicts into
            Greenhouse, Lever, or Ashby automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

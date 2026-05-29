"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { LogoMark } from "@/components/Logo";
import { toast } from "sonner";
import { Github, Mail, Lock, User as UserIcon, Loader2, UserCheck, Briefcase, Check, ShieldCheck, ArrowLeft } from "lucide-react";
import { SiGoogle, SiFacebook } from "react-icons/si";

type Providers = {
  github: boolean;
  google: boolean;
  facebook: boolean;
};

export default function AuthCard({
  providers,
  next,
}: {
  providers: Providers;
  next: string;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"candidate" | "recruiter" | "">("");
  const [pending, startTransition] = useTransition();
  // IP-42 P5: 2FA step state. `needsTotp` is set after the first signin attempt
  // fails with code "TotpRequired" — we don't ask preemptively because that
  // would leak which emails have 2FA enabled.
  const [needsTotp, setNeedsTotp] = useState(false);
  const [totp, setTotp] = useState("");
  const [totpError, setTotpError] = useState<string | null>(null);

  const anyOAuth = providers.github || providers.google || providers.facebook;

  function oauth(provider: "github" | "google" | "facebook") {
    void signIn(provider, { redirectTo: next });
  }

  function backToPassword() {
    setNeedsTotp(false);
    setTotp("");
    setTotpError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTotpError(null);
    startTransition(async () => {
      try {
        if (mode === "signup") {
          if (!userType) {
            throw new Error("Please choose whether you're a candidate or recruiter.");
          }
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: name.trim() || undefined,
              email,
              password,
              userType,
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? `HTTP ${res.status}`);
          }
        }

        // IMPORTANT: don't pass `totp: undefined` — next-auth's React signIn
        // shoves the credentials object through `URLSearchParams(...)`, which
        // serializes the undefined to the literal string "undefined". The
        // server would then try to verify "undefined" as a 6-digit code,
        // fail, and throw TotpInvalid on the FIRST submit. So we omit the
        // field entirely until we actually have a code to send.
        const credentials: Record<string, string> = { email, password };
        if (needsTotp && totp.trim().length > 0) {
          credentials.totp = totp.trim();
        }
        const result = await signIn("credentials", {
          ...credentials,
          redirect: false,
        });

        // The Auth.js v5 error surface for CredentialsSignin subclasses
        // exposes the subclass `code` via `result.code`.
        const errCode = (result as { code?: string; error?: string } | null)?.code
          ?? (result as { error?: string } | null)?.error
          ?? null;

        if (!result || result.error) {
          if (errCode === "TotpRequired") {
            // Password was right; flip to step 2.
            setNeedsTotp(true);
            return;
          }
          if (errCode === "TotpInvalid") {
            setTotpError("That code didn't match. Try the next one — codes roll every 30 seconds.");
            setTotp("");
            return;
          }
          throw new Error(
            errCode === "CredentialsSignin"
              ? "Wrong email or password."
              : (errCode ?? "Sign in failed.")
          );
        }
        toast.success(mode === "signup" ? "Account created" : "Welcome back");
        window.location.href = next;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(mode === "signup" ? "Sign-up failed" : "Sign-in failed", {
          description: msg,
        });
      }
    });
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-panel/70 backdrop-blur p-7 shadow-soft">
      <LogoMark size={40} className="mb-4" />
      <h1 className="text-xl font-semibold tracking-tight">
        {mode === "signin" ? "Sign in to Interviewpad" : "Create your account"}
      </h1>
      <p className="text-sm text-muted mt-1 mb-6">
        {mode === "signin"
          ? "Save, fork, and share your snippets across devices."
          : "It takes about 10 seconds. No credit card."}
      </p>

      {/* OAuth providers — hidden during the 2FA step to keep focus on the
          single TOTP input. */}
      {anyOAuth && !needsTotp && (
        <div className="space-y-2 mb-5">
          {providers.github && (
            <button
              type="button"
              onClick={() => oauth("github")}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border bg-surface hover:bg-elevated text-sm transition"
            >
              <Github className="w-4 h-4" />
              Continue with GitHub
            </button>
          )}
          {providers.google && (
            <button
              type="button"
              onClick={() => oauth("google")}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border bg-surface hover:bg-elevated text-sm transition"
            >
              <SiGoogle size={14} className="text-[#ea4335]" />
              Continue with Google
            </button>
          )}
          {providers.facebook && (
            <button
              type="button"
              onClick={() => oauth("facebook")}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border bg-surface hover:bg-elevated text-sm transition"
            >
              <SiFacebook size={14} className="text-[#1877f2]" />
              Continue with Facebook
            </button>
          )}
        </div>
      )}

      {anyOAuth && !needsTotp && (
        <div className="flex items-center gap-3 my-5 text-[10px] uppercase tracking-wide text-muted">
          <div className="flex-1 h-px bg-border" />
          or with email
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Email + password (and optional 2FA step) */}
      <form onSubmit={submit} className="space-y-3">
        {needsTotp ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.04] px-3 py-2 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[12px] text-fg leading-relaxed">
                Two-factor authentication is on for{" "}
                <span className="font-semibold">{email}</span>.
                Enter the 6-digit code from your authenticator app, or a backup code.
              </div>
            </div>
            <label className="block">
              <span className="sr-only">2FA code</span>
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                placeholder="123456 or backup code"
                className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border focus:border-accent/60 text-base font-mono tracking-[0.3em] outline-none placeholder:text-muted text-center"
              />
            </label>
            {totpError && (
              <div className="text-[11px] text-rose-300">{totpError}</div>
            )}
            <button
              type="button"
              onClick={backToPassword}
              className="text-[11px] text-muted hover:text-fg inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Use a different email
            </button>
          </div>
        ) : (
          <>
        {mode === "signup" && (
          <>
            {/* User type chooser */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                I'm signing up as
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUserType("candidate")}
                  className={`relative text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    userType === "candidate"
                      ? "border-indigo-500/50 bg-indigo-500/10"
                      : "border-border bg-surface hover:border-accent/40"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <UserCheck className={`w-4 h-4 mt-0.5 shrink-0 ${userType === "candidate" ? "text-indigo-500" : "text-muted"}`} />
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold ${userType === "candidate" ? "text-indigo-600 dark:text-indigo-300" : "text-fg"}`}>
                        Candidate
                      </div>
                      <div className="text-[11px] text-muted mt-0.5 leading-snug">
                        Practice, take tests, join interviews
                      </div>
                    </div>
                  </div>
                  {userType === "candidate" && (
                    <Check className="absolute top-2 right-2 w-3.5 h-3.5 text-indigo-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setUserType("recruiter")}
                  className={`relative text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    userType === "recruiter"
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-border bg-surface hover:border-accent/40"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Briefcase className={`w-4 h-4 mt-0.5 shrink-0 ${userType === "recruiter" ? "text-emerald-500" : "text-muted"}`} />
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold ${userType === "recruiter" ? "text-emerald-600 dark:text-emerald-300" : "text-fg"}`}>
                        Recruiter
                      </div>
                      <div className="text-[11px] text-muted mt-0.5 leading-snug">
                        Manage workspaces, source candidates
                      </div>
                    </div>
                  </div>
                  {userType === "recruiter" && (
                    <Check className="absolute top-2 right-2 w-3.5 h-3.5 text-emerald-500" />
                  )}
                </button>
              </div>
            </div>

            <label className="block">
              <span className="sr-only">Name</span>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Display name (optional)"
                  autoComplete="name"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-surface border border-border focus:border-accent/60 text-sm outline-none placeholder:text-muted"
                />
              </div>
            </label>
          </>
        )}
        <label className="block">
          <span className="sr-only">Email</span>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete={mode === "signin" ? "email" : "email"}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-surface border border-border focus:border-accent/60 text-sm outline-none placeholder:text-muted"
            />
          </div>
        </label>
        <label className="block">
          <span className="sr-only">Password</span>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 8 characters" : "Password"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-surface border border-border focus:border-accent/60 text-sm outline-none placeholder:text-muted"
            />
          </div>
        </label>

          </>
        )}

        <button
          type="submit"
          disabled={pending || (needsTotp && totp.trim().length === 0)}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent hover:bg-accent-soft text-white text-sm font-medium shadow-soft transition disabled:opacity-60"
        >
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          {needsTotp
            ? "Verify and sign in"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <div className="mt-5 text-center text-xs text-muted">
        {needsTotp ? (
          <span className="text-muted/70">
            Lost your authenticator? Use one of your backup codes above.
          </span>
        ) : mode === "signin" ? (
          <>
            New to Interviewpad?{" "}
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="text-accent hover:underline"
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-accent hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}

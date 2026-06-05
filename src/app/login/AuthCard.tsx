"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { LogoLockup } from "@/components/Logo";
import { toast } from "sonner";
import { Github, Mail, Lock, User as UserIcon, Loader2, UserCheck, Briefcase, Check, ShieldCheck, ArrowLeft, Tag, Users } from "lucide-react";
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
  const [needsTotp, setNeedsTotp] = useState(false);
  const [totp, setTotp] = useState("");
  const [totpError, setTotpError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [signupVerificationPending, setSignupVerificationPending] = useState(false);
  const [signupOtp, setSignupOtp] = useState("");
  const [signupOtpError, setSignupOtpError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [transitionStage, setTransitionStage] = useState<'idle' | 'exiting' | 'entering'>('idle');

  const isRecruiterEmailInvalid = () => {
    if (userType !== "recruiter" || !email) return false;
    const publicDomains = [
      "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", 
      "icloud.com", "aol.com", "protonmail.com", "proton.me", 
      "mail.com", "zoho.com"
    ];
    const domain = email.split("@")[1]?.toLowerCase();
    return publicDomains.includes(domain);
  };

  const anyOAuth = providers.github || providers.google || providers.facebook;
  const showOAuth = anyOAuth && !needsTotp && !signupVerificationPending && (mode === "signin" || userType !== "recruiter");

  function oauth(provider: "github" | "google" | "facebook") {
    void signIn(provider, { redirectTo: next });
  }

  function backToPassword() {
    setNeedsTotp(false);
    setTotp("");
    setTotpError(null);
  }

  function backToSignup() {
    setSignupVerificationPending(false);
    setSignupOtp("");
    setSignupOtpError(null);
  }

  function toggleMode(newMode: "signin" | "signup") {
    if (transitionStage !== 'idle') return;
    setTransitionStage('exiting');

    setTimeout(() => {
      setMode(newMode);
      setEmail("");
      setPassword("");
      setSignupVerificationPending(false);
      setSignupOtp("");
      setSignupOtpError(null);
      setNeedsTotp(false);
      setTotp("");
      setTotpError(null);
      setTransitionStage('entering');

      setTimeout(() => {
        setTransitionStage('idle');
      }, 500);
    }, 250);
  }

  const handleResendOtp = async () => {
    setResending(true);
    setSignupOtpError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email,
          password,
          userType,
          ...(userType === "recruiter" ? {
            companyName: companyName.trim(),
            companySize: companySize || undefined,
            jobTitle: jobTitle.trim() || undefined,
          } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      toast.success("Verification code resent!", {
        description: `A new 6-digit code has been sent to ${email}.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Failed to resend code", { description: msg });
    } finally {
      setResending(false);
    }
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTotpError(null);
    setSignupOtpError(null);
    startTransition(async () => {
      try {
        if (mode === "signup") {
          if (!userType) {
            throw new Error("Please choose whether you're a candidate or recruiter.");
          }
          if (!termsAccepted) {
            throw new Error("You must agree to the Terms of Service and Privacy Policy.");
          }
          if (userType === "recruiter") {
            if (isRecruiterEmailInvalid()) {
              throw new Error("Recruiters must sign up with an official company email address.");
            }
            if (!name.trim()) {
              throw new Error("Display name is required for recruiters.");
            }
            if (!companyName.trim()) {
              throw new Error("Company name is required for recruiters.");
            }
            if (!jobTitle.trim()) {
              throw new Error("Job title is required for recruiters.");
            }
            if (!companySize) {
              throw new Error("Company size is required for recruiters.");
            }
          }
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: name.trim() || undefined,
              email,
              password,
              userType,
              ...(userType === "recruiter" ? {
                companyName: companyName.trim(),
                companySize: companySize || undefined,
                jobTitle: jobTitle.trim() || undefined,
              } : {}),
              ...(signupVerificationPending ? { otp: signupOtp.trim() } : {}),
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            if (signupVerificationPending) {
              setSignupOtpError(data.error ?? "Invalid verification code.");
            }
            throw new Error(data.error ?? `HTTP ${res.status}`);
          }
          const data = await res.json().catch(() => ({}));
          if (data.otpSent) {
            setSignupVerificationPending(true);
            toast.success("Verification code sent!", {
              description: `We've sent a 6-digit verification code to ${email}.`,
            });
            return;
          }
        }

        const credentials: Record<string, string> = { email, password };
        if (needsTotp && totp.trim().length > 0) {
          credentials.totp = totp.trim();
        }
        const result = await signIn("credentials", {
          ...credentials,
          redirect: false,
        });

        const errCode = (result as { code?: string; error?: string } | null)?.code
          ?? (result as { error?: string } | null)?.error
          ?? null;

        if (!result || result.error) {
          if (errCode === "TotpRequired") {
            setNeedsTotp(true);
            return;
          }
          if (errCode === "TotpInvalid") {
            setTotpError("That code didn't match. Try the next one — codes roll every 30 seconds.");
            setTotp("");
            return;
          }
          if (errCode === "TotpRateLimited") {
            setTotpError("Too many attempts. Wait a few minutes and try again.");
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
    <div className="w-full max-w-sm mx-auto flex flex-col justify-center">
      <style>{`
        @keyframes authCardExit {
          0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
          100% { opacity: 0; transform: translateY(-20px) scale(0.96); filter: blur(8px); }
        }
        @keyframes authCardEnter {
          0% { opacity: 0; transform: translateY(30px) scale(0.96); filter: blur(8px); }
          50% { filter: blur(2px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
        }
        @keyframes authFormReveal {
          0% { opacity: 0; transform: translateY(16px) scale(0.98); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
        }
        .auth-form-reveal > * {
          animation: authFormReveal 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .auth-form-reveal > *:nth-child(1) { animation-delay: 0s; }
        .auth-form-reveal > *:nth-child(2) { animation-delay: 0.06s; }
        .auth-form-reveal > *:nth-child(3) { animation-delay: 0.12s; }
        .auth-form-reveal > *:nth-child(4) { animation-delay: 0.18s; }
        .auth-form-reveal > *:nth-child(5) { animation-delay: 0.24s; }
        .auth-form-reveal > *:nth-child(6) { animation-delay: 0.30s; }
        .auth-form-reveal > *:nth-child(7) { animation-delay: 0.36s; }
      `}</style>
      <div
        style={
          transitionStage === 'exiting'
            ? { animation: 'authCardExit 0.25s ease-in forwards' }
            : transitionStage === 'entering'
            ? { animation: 'authCardEnter 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards' }
            : undefined
        }
      >
      <div className="flex flex-col items-center sm:items-start animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex flex-col items-center sm:items-start gap-2.5 mb-[clamp(0.4rem,1vh,0.75rem)]">
          <LogoLockup height={42} className="drop-shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]" />
          <h1 className="text-[clamp(1.5rem,3vh,1.85rem)] font-black tracking-tight text-fg leading-tight">
            {signupVerificationPending
              ? "Verify your email"
              : mode === "signin"
                ? "Welcome back"
                : "Join Interviewpad"}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-muted/90 mb-[clamp(1rem,2.2vh,1.75rem)] leading-relaxed max-w-[95%] text-center sm:text-left">
          {signupVerificationPending
            ? "Enter the 6-digit code we sent to verify your identity."
            : mode === "signin"
              ? "Enter your details to sign in to your workspace."
              : "Create an account in seconds to start building and hiring."}
        </p>
      </div>

      {/* OAuth providers — hidden in signup until role is selected */}
      {showOAuth && (mode === "signin" || userType) && (
        <div className="flex items-center justify-center gap-[clamp(0.5rem,1.2vh,1rem)] mb-[clamp(0.75rem,2vh,1.25rem)] animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 fill-mode-both">
          {providers.github && (
            <button
              type="button"
              onClick={() => oauth("github")}
              title="Continue with GitHub"
              aria-label="Continue with GitHub"
              className="flex-1 max-w-[80px] relative flex items-center justify-center py-[clamp(0.5rem,1vh,0.75rem)] rounded-xl border border-border bg-surface/40 dark:border-white/10 dark:bg-surface/20 hover:bg-surface dark:hover:bg-surface/40 hover:border-border-strong text-fg transition-all duration-300 active:scale-[0.95] overflow-hidden group shadow-sm hover:shadow-md"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-fg/0 via-fg/[0.03] to-fg/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          )}
          {providers.google && (
            <button
              type="button"
              onClick={() => oauth("google")}
              title="Continue with Google"
              aria-label="Continue with Google"
              className="flex-1 max-w-[80px] relative flex items-center justify-center py-[clamp(0.5rem,1vh,0.75rem)] rounded-xl border border-border bg-surface/40 dark:border-white/10 dark:bg-surface/20 hover:bg-surface dark:hover:bg-surface/40 hover:border-border-strong text-fg transition-all duration-300 active:scale-[0.95] overflow-hidden group shadow-sm hover:shadow-md"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-fg/0 via-fg/[0.03] to-fg/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <SiGoogle size={18} className="text-[#ea4335] group-hover:scale-110 transition-transform" />
            </button>
          )}
          {providers.facebook && (
            <button
              type="button"
              onClick={() => oauth("facebook")}
              title="Continue with Facebook"
              aria-label="Continue with Facebook"
              className="flex-1 max-w-[80px] relative flex items-center justify-center py-[clamp(0.5rem,1vh,0.75rem)] rounded-xl border border-border bg-surface/40 dark:border-white/10 dark:bg-surface/20 hover:bg-surface dark:hover:bg-surface/40 hover:border-border-strong text-fg transition-all duration-300 active:scale-[0.95] overflow-hidden group shadow-sm hover:shadow-md"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-fg/0 via-fg/[0.03] to-fg/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <SiFacebook size={18} className="text-[#1877f2] group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
      )}

      {showOAuth && (mode === "signin" || userType) && (
        <div className="flex items-center gap-4 my-[clamp(0.75rem,2vh,1.25rem)] animate-in fade-in duration-500 delay-200 fill-mode-both">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-border" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted">or continue with email</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-border" />
        </div>
      )}

      {/* Email + password */}
      <form onSubmit={submit} className="space-y-[clamp(0.5rem,1.1vh,0.85rem)] animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300 fill-mode-both">
        {needsTotp ? (
          <div className="space-y-[clamp(0.5rem,1.1vh,0.85rem)]">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-fg/80 leading-relaxed">
                Two-factor authentication is on for{" "}
                <span className="font-semibold text-fg">{email}</span>.
                Enter the 6-digit code from your authenticator app, or a backup code.
              </div>
            </div>
            <label className="block group">
              <span className="sr-only">2FA code</span>
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-[clamp(0.55rem,1.1vh,0.85rem)] rounded-xl bg-surface/40 dark:bg-surface/15 border border-border hover:border-border-strong dark:border-white/10 dark:hover:border-white/20 focus:border-accent focus:bg-bg dark:focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all text-lg font-mono tracking-[0.4em] outline-none placeholder:text-muted/60 text-center text-fg shadow-sm"
              />
            </label>
            {totpError && (
              <div className="text-xs text-rose-500 dark:text-rose-400 font-semibold text-center">{totpError}</div>
            )}
            <button
              type="button"
              onClick={backToPassword}
              className="mx-auto flex items-center justify-center gap-1.5 text-[11px] text-muted hover:text-fg font-semibold transition-colors mt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Use a different email
            </button>
          </div>
        ) : signupVerificationPending ? (
          <div className="space-y-[clamp(0.5rem,1.1vh,0.85rem)]">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/10 p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <Mail className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-fg/80 leading-relaxed">
                We've sent a 6-digit verification code to{" "}
                <span className="font-semibold text-fg">{email}</span>.
                Enter it below to verify your email.
              </div>
            </div>
            <label className="block group">
              <span className="sr-only">Verification Code</span>
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={signupOtp}
                onChange={(e) => {
                  setSignupOtp(e.target.value);
                  if (signupOtpError) setSignupOtpError(null);
                }}
                placeholder="123456"
                className="w-full px-4 py-[clamp(0.55rem,1.1vh,0.85rem)] rounded-xl bg-surface/40 dark:bg-surface/15 border border-border hover:border-border-strong dark:border-white/10 dark:hover:border-white/20 focus:border-accent focus:bg-bg dark:focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all text-lg font-mono tracking-[0.4em] outline-none placeholder:text-muted/60 text-center text-fg shadow-sm"
              />
            </label>
            {signupOtpError && (
              <div className="text-xs text-rose-500 dark:text-rose-400 font-semibold text-center">{signupOtpError}</div>
            )}
            <div className="flex items-center justify-between mt-2 px-1">
              <button
                type="button"
                onClick={backToSignup}
                className="flex items-center gap-1.5 text-[11px] text-muted hover:text-fg font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back / Change email
              </button>
              <button
                type="button"
                disabled={resending}
                onClick={handleResendOtp}
                className="text-[11px] text-accent hover:text-accent-soft disabled:opacity-50 font-bold transition-colors"
              >
                {resending ? "Sending..." : "Resend Code"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {mode === "signup" && (
              <>
                <div className="space-y-[clamp(0.25rem,0.6vh,0.5rem)] mb-[clamp(0.25rem,0.6vh,0.5rem)]">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-[clamp(0.25rem,0.6vh,0.5rem)] pl-1">
                    Select Your Role
                  </div>
                  <div className="grid grid-cols-2 gap-[clamp(0.5rem,1vh,0.75rem)]">
                    <button
                      type="button"
                      onClick={() => setUserType("candidate")}
                      className={`relative flex flex-col items-center justify-center gap-2 p-[clamp(0.6rem,1.2vh,1rem)] rounded-2xl border-2 transition-all duration-300 cursor-pointer active:scale-[0.98] ${
                        userType === "candidate"
                          ? "border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-[0_8px_24px_-8px_rgba(99,102,241,0.2)]"
                          : "border-border/85 dark:border-white/10 bg-surface/40 dark:bg-surface/20 hover:border-border-strong hover:bg-surface/60"
                      }`}
                    >
                      <UserCheck className={`w-[clamp(1.1rem,2.2vh,1.4rem)] h-[clamp(1.1rem,2.2vh,1.4rem)] transition-transform duration-300 ${userType === "candidate" ? "text-indigo-600 dark:text-indigo-400 scale-110" : "text-muted/70"}`} />
                      <div className={`text-xs font-bold transition-colors ${userType === "candidate" ? "text-indigo-600 dark:text-indigo-400" : "text-fg/80"}`}>
                        Candidate
                      </div>
                      {userType === "candidate" && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center animate-in zoom-in duration-300 shadow-md">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserType("recruiter")}
                      className={`relative flex flex-col items-center justify-center gap-2 p-[clamp(0.6rem,1.2vh,1rem)] rounded-2xl border-2 transition-all duration-300 cursor-pointer active:scale-[0.98] ${
                        userType === "recruiter"
                          ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.2)]"
                          : "border-border/85 dark:border-white/10 bg-surface/40 dark:bg-surface/20 hover:border-border-strong hover:bg-surface/60"
                      }`}
                    >
                      <Briefcase className={`w-[clamp(1.1rem,2.2vh,1.4rem)] h-[clamp(1.1rem,2.2vh,1.4rem)] transition-transform duration-300 ${userType === "recruiter" ? "text-emerald-600 dark:text-emerald-400 scale-110" : "text-muted/70"}`} />
                      <div className={`text-xs font-bold transition-colors ${userType === "recruiter" ? "text-emerald-600 dark:text-emerald-400" : "text-fg/80"}`}>
                        Recruiter
                      </div>
                      {userType === "recruiter" && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center animate-in zoom-in duration-300 shadow-md">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
            {/* Show form fields only in signin mode, or signup mode with a role selected */}
            {(mode === "signin" || userType) ? (
              <div className={`space-y-[clamp(0.5rem,1.1vh,0.85rem)] ${mode === "signup" && userType ? "auth-form-reveal" : ""}`} key={`form-${mode}-${userType}`}>
                {/* Signup-specific: Display name + recruiter fields */}
                {mode === "signup" && (
                  <>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted/70 group-focus-within:text-accent transition-colors">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={userType === "recruiter" ? "Full name" : "Display name (optional)"}
                        required={userType === "recruiter"}
                        autoComplete="name"
                        className="w-full pl-12 pr-4 py-[clamp(0.55rem,1.1vh,0.85rem)] rounded-xl bg-surface/40 dark:bg-surface/15 border border-border hover:border-border-strong dark:border-white/10 dark:hover:border-white/20 focus:border-accent focus:bg-bg dark:focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all text-sm outline-none placeholder:text-muted/60 text-fg shadow-sm"
                      />
                    </div>

                    {/* Recruiter-specific fields */}
                    {userType === "recruiter" && (
                      <div className="space-y-[clamp(0.5rem,1.1vh,0.85rem)] animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted/70 group-focus-within:text-accent transition-colors">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <input
                            type="text"
                            required
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Company name"
                            className="w-full pl-12 pr-4 py-[clamp(0.55rem,1.1vh,0.85rem)] rounded-xl bg-surface/40 dark:bg-surface/15 border border-border hover:border-border-strong dark:border-white/10 dark:hover:border-white/20 focus:border-accent focus:bg-bg dark:focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all text-sm outline-none placeholder:text-muted/60 text-fg shadow-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-[clamp(0.5rem,1vh,0.75rem)]">
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted/70 group-focus-within:text-accent transition-colors">
                              <Tag className="w-4 h-4" />
                            </div>
                            <input
                              type="text"
                              required
                              value={jobTitle}
                              onChange={(e) => setJobTitle(e.target.value)}
                              placeholder="Job title"
                              className="w-full pl-10 pr-4 py-[clamp(0.55rem,1.1vh,0.85rem)] rounded-xl bg-surface/40 dark:bg-surface/15 border border-border hover:border-border-strong dark:border-white/10 dark:hover:border-white/20 focus:border-accent focus:bg-bg dark:focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all text-sm outline-none placeholder:text-muted/60 text-fg shadow-sm"
                            />
                          </div>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted/70 group-focus-within:text-accent transition-colors">
                              <Users className="w-4 h-4" />
                            </div>
                            <select
                              value={companySize}
                              required
                              onChange={(e) => setCompanySize(e.target.value)}
                              className="w-full pl-10 pr-8 py-[clamp(0.55rem,1.1vh,0.85rem)] rounded-xl bg-surface/40 dark:bg-surface/15 border border-border hover:border-border-strong dark:border-white/10 dark:hover:border-white/20 focus:border-accent focus:bg-bg dark:focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all text-sm outline-none text-fg/80 shadow-sm appearance-none cursor-pointer"
                            >
                              <option value="" disabled className="text-muted bg-surface">Company size</option>
                              <option value="1-10" className="bg-surface">1 - 10</option>
                              <option value="11-50" className="bg-surface">11 - 50</option>
                              <option value="51-200" className="bg-surface">51 - 200</option>
                              <option value="201-500" className="bg-surface">201 - 500</option>
                              <option value="501-1000" className="bg-surface">501 - 1000</option>
                              <option value="1000+" className="bg-surface">1000+</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-muted">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted/70 group-focus-within:text-accent transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    autoComplete={mode === "signin" ? "email" : "new-email"}
                    className={`w-full pl-12 pr-4 py-[clamp(0.55rem,1.1vh,0.85rem)] rounded-xl bg-surface/40 dark:bg-surface/15 border focus:bg-bg transition-all text-sm outline-none placeholder:text-muted/60 text-fg shadow-sm ${
                      isRecruiterEmailInvalid()
                        ? "border-amber-500/80 focus:border-amber-500 focus:ring-amber-500/10"
                        : "border-border hover:border-border-strong dark:border-white/10 dark:hover:border-white/20 focus:border-accent dark:focus:border-accent/80 focus:ring-4 focus:ring-accent/10"
                    }`}
                  />
                </div>
                {isRecruiterEmailInvalid() && (
                  <div className="text-xs text-amber-500 dark:text-amber-400 pl-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    Please register with your official company email address (e.g. name@company.com).
                  </div>
                )}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted/70 group-focus-within:text-accent transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Create a password (min 8 chars)" : "Password"}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="w-full pl-12 pr-4 py-[clamp(0.55rem,1.1vh,0.85rem)] rounded-xl bg-surface/40 dark:bg-surface/15 border border-border hover:border-border-strong dark:border-white/10 dark:hover:border-white/20 focus:border-accent focus:bg-bg dark:focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all text-sm outline-none placeholder:text-muted/60 text-fg shadow-sm"
                  />
                </div>
                {mode === "signup" && (
                  <label className="flex items-start gap-[clamp(0.4rem,0.8vh,0.75rem)] pl-1 pt-[clamp(0.1rem,0.3vh,0.25rem)] cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      required
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-border text-accent focus:ring-accent/20 cursor-pointer"
                    />
                    <span className="text-xs text-muted leading-relaxed group-hover:text-fg transition-colors">
                      I agree to the{" "}
                      <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Terms of Service", { description: "These are the standard Terms of Service for using Interviewpad." }); }} className="text-accent hover:underline font-semibold">Terms of Service</a>{" "}
                      and{" "}
                      <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Privacy Policy", { description: "Your data is safe and processed in compliance with local privacy standards." }); }} className="text-accent hover:underline font-semibold">Privacy Policy</a>.
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={pending || (needsTotp && totp.trim().length === 0) || (signupVerificationPending && signupOtp.trim().length === 0)}
                  className="w-full relative flex items-center justify-center gap-2 py-[clamp(0.65rem,1.3vh,0.9rem)] mt-[clamp(0.25rem,0.8vh,0.75rem)] rounded-xl bg-accent text-bg text-sm font-black uppercase tracking-wide transition-all duration-300 active:scale-[0.98] disabled:opacity-50 overflow-hidden group shadow-[0_4px_20px_rgba(var(--accent-rgb),0.3)] hover:shadow-[0_8px_30px_rgba(var(--accent-rgb),0.4)]"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  {pending && <Loader2 className="w-5 h-5 animate-spin" />}
                  {needsTotp
                    ? "Verify and Sign In"
                    : signupVerificationPending
                      ? "Verify and Create Account"
                      : mode === "signin"
                        ? "Sign In"
                        : "Create Account"}
                </button>
              </div>
            ) : (
              <div className="text-center py-[clamp(1rem,2.5vh,2rem)] text-sm text-muted/70 animate-in fade-in duration-500">
                Select your role above to continue
              </div>
            )}
          </>
        )}

        {/* Submit button for TOTP/OTP flows (always visible when those are active) */}
        {(needsTotp || signupVerificationPending) && (
          <button
            type="submit"
            disabled={pending || (needsTotp && totp.trim().length === 0) || (signupVerificationPending && signupOtp.trim().length === 0)}
            className="w-full relative flex items-center justify-center gap-2 py-[clamp(0.65rem,1.3vh,0.9rem)] mt-[clamp(0.25rem,0.8vh,0.75rem)] rounded-xl bg-accent text-bg text-sm font-black uppercase tracking-wide transition-all duration-300 active:scale-[0.98] disabled:opacity-50 overflow-hidden group shadow-[0_4px_20px_rgba(var(--accent-rgb),0.3)] hover:shadow-[0_8px_30px_rgba(var(--accent-rgb),0.4)]"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            {pending && <Loader2 className="w-5 h-5 animate-spin" />}
            {needsTotp ? "Verify and Sign In" : "Verify and Create Account"}
          </button>
        )}
      </form>

      <div className="mt-[clamp(0.75rem,2.2vh,1.5rem)] text-center text-sm text-muted font-medium animate-in fade-in duration-500 delay-500 fill-mode-both">
        {needsTotp ? (
          <span className="text-muted/80">
            Lost your authenticator? Use a backup code above.
          </span>
        ) : signupVerificationPending ? (
          <span className="text-muted/80">
            Didn't receive the email? Check your spam folder or click Resend Code above.
          </span>
        ) : mode === "signin" ? (
          <>
            New to Interviewpad?{" "}
            <button
              type="button"
              onClick={() => toggleMode("signup")}
              className="text-accent hover:text-accent-soft hover:underline font-bold transition-colors"
            >
              Join here
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => toggleMode("signin")}
              className="text-accent hover:text-accent-soft hover:underline font-bold transition-colors"
            >
              Sign in
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  );
}


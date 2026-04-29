"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { LogoMark } from "@/components/Logo";
import { toast } from "sonner";
import { Github, Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
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
  const [pending, startTransition] = useTransition();

  const anyOAuth = providers.github || providers.google || providers.facebook;

  function oauth(provider: "github" | "google" | "facebook") {
    void signIn(provider, { redirectTo: next });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (mode === "signup") {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: name.trim() || undefined, email, password }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? `HTTP ${res.status}`);
          }
        }
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (!result || result.error) {
          throw new Error(
            result?.error === "CredentialsSignin"
              ? "Wrong email or password."
              : (result?.error ?? "Sign in failed.")
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
        {mode === "signin" ? "Sign in to Codepad" : "Create your account"}
      </h1>
      <p className="text-sm text-muted mt-1 mb-6">
        {mode === "signin"
          ? "Save, fork, and share your snippets across devices."
          : "It takes about 10 seconds. No credit card."}
      </p>

      {/* OAuth providers */}
      {anyOAuth && (
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

      {anyOAuth && (
        <div className="flex items-center gap-3 my-5 text-[10px] uppercase tracking-wide text-muted">
          <div className="flex-1 h-px bg-border" />
          or with email
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Email + password */}
      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
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

        <button
          type="submit"
          disabled={pending}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent hover:bg-accent-soft text-white text-sm font-medium shadow-soft transition disabled:opacity-60"
        >
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <div className="mt-5 text-center text-xs text-muted">
        {mode === "signin" ? (
          <>
            New to Codepad?{" "}
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

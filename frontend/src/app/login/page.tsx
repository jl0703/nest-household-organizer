"use client";

import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeRedirectPath } from "@/lib/safe-redirect";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "google">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("submitting");
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setStatus("idle");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError(null);
    setStatus("google");
    const supabase = createSupabaseBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setStatus("idle");
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Sign in to your household</h1>

        <button
          type="button"
          className="oauth-button"
          onClick={handleGoogleSignIn}
          disabled={status !== "idle"}
        >
          {status === "google" ? "Redirecting to Google…" : "Continue with Google"}
        </button>

        <div className="divider" role="separator">
          <span>or sign in with email</span>
        </div>

        {error && (
          <p className="status-banner error" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handlePasswordSignIn} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <button type="submit" className="primary full-width" disabled={status !== "idle"}>
            {status === "submitting" ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-shell" aria-busy="true" />}>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/frontend/lib/supabase-browser";

function safeRedirect(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeRedirect(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    const errors: { email?: string; password?: string } = {};
    if (!email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address";
    }
    if (!password) {
      errors.password = "Password is required";
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.push(redirect);
  }

  async function handleOAuth() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-bold text-text">Log in to Comicly</h1>

        <button
          type="button"
          onClick={handleOAuth}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface py-2.5 text-sm font-medium text-text transition-colors hover:bg-surface-alt"
        >
          Continue with Google
        </button>

        <div className="mb-4 flex items-center gap-3">
          <hr className="flex-1 border-border" />
          <span className="text-xs text-text-secondary">or</span>
          <hr className="flex-1 border-border" />
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-text"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={[
                "w-full rounded-lg border px-3 py-2 text-sm text-text outline-none transition-colors",
                "focus:ring-2 focus:ring-border-focus",
                fieldErrors.email ? "border-error" : "border-border",
              ].join(" ")}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-error">{fieldErrors.email}</p>
            )}
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-text"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={[
                "w-full rounded-lg border px-3 py-2 text-sm text-text outline-none transition-colors",
                "focus:ring-2 focus:ring-border-focus",
                fieldErrors.password ? "border-error" : "border-border",
              ].join(" ")}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-error">{fieldErrors.password}</p>
            )}
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-error-light px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? "Signing in\u2026" : "Log In"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

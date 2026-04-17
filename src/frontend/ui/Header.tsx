"use client";

import Link from "next/link";

/**
 * Global site header.
 *
 * Sprint 1: always renders the logged-out state.
 * TODO(#18): wire up Supabase onAuthStateChange and swap in auth-aware nav.
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-surface border-b border-border">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-text transition-colors hover:text-primary"
        >
          Comicly
        </Link>

        {/* Auth controls — TODO(#18): replace with <AuthNav /> */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-text-secondary transition-colors hover:text-text"
          >
            Log In
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover"
          >
            Sign Up
          </Link>
        </div>
      </nav>
    </header>
  );
}

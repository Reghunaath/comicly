"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getComic } from "@/frontend/lib/api";
import type { Comic } from "@/frontend/lib/types";

type Phase = "loading" | "not_found" | "generating" | "complete" | "error";

export default function ComicViewerPage({ comicId }: { comicId: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [comic, setComic] = useState<Comic | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  // -------------------------------------------------------------------------
  // On mount: fetch comic
  // -------------------------------------------------------------------------

  useEffect(() => {
    getComic(comicId)
      .then(({ comic: loaded }) => {
        setComic(loaded);
        setPhase(loaded.status === "complete" ? "complete" : "generating");
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.message === "Comic not found") {
          setPhase("not_found");
        } else {
          setPhase("error");
        }
      });
  }, [comicId]);

  // -------------------------------------------------------------------------
  // Polling: check progress every 5s while generating
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (phase !== "generating") return;

    const intervalId = setInterval(async () => {
      try {
        const { comic: updated } = await getComic(comicId);
        setComic(updated);
        if (updated.status === "complete") {
          clearInterval(intervalId);
          setPhase("complete");
        }
      } catch {
        // Transient error — keep polling
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [phase, comicId]);

  // -------------------------------------------------------------------------
  // Share handler
  // -------------------------------------------------------------------------

  function handleShare() {
    navigator.clipboard?.writeText(window.location.href)?.catch(() => undefined);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  }

  // -------------------------------------------------------------------------
  // Render: loading
  // -------------------------------------------------------------------------

  if (phase === "loading") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-background py-20">
        <Spinner className="h-10 w-10 border-primary" aria-label="Loading comic" />
        <p className="text-sm text-text-secondary">Loading…</p>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Render: not found
  // -------------------------------------------------------------------------

  if (phase === "not_found") {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-4 py-20">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface px-6 py-8 text-center">
          <p className="mb-2 text-4xl font-bold text-text">404</p>
          <p className="mb-1 text-sm font-semibold text-text">Comic not found</p>
          <p className="mb-6 text-sm text-text-secondary">
            This comic doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover"
          >
            Make your own
          </Link>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Render: error
  // -------------------------------------------------------------------------

  if (phase === "error") {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-4 py-20">
        <div className="w-full max-w-md rounded-2xl border border-error-light bg-error-light px-6 py-8 text-center">
          <p className="mb-1 text-sm font-semibold text-error">Something went wrong</p>
          <p className="mb-6 text-sm text-error">Failed to load this comic.</p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover"
          >
            Go home
          </Link>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Render: generating / complete
  // -------------------------------------------------------------------------

  const title = comic?.script?.title ?? "Your Comic";
  const pages = comic?.pages ?? [];
  const totalPages = comic?.pageCount ?? pages.length;

  return (
    <main className="flex-1 bg-background">

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toastVisible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium text-text shadow-lg"
        >
          Link copied!
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">

        {/* ── Title bar ──────────────────────────────────────────────────── */}
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
              Comic
            </p>
            <h1 className="text-2xl font-bold text-text">{title}</h1>
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="shrink-0 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-alt"
          >
            Share
          </button>
        </header>

        {/* ── Generating progress banner ─────────────────────────────────── */}
        {phase === "generating" && (
          <div
            role="status"
            aria-label="Generation progress"
            className="mb-8 flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4"
          >
            <Spinner className="h-5 w-5 shrink-0 border-primary" />
            <p className="text-sm font-medium text-text">
              Generating page {pages.length} of {totalPages}…
            </p>
          </div>
        )}

        {/* ── Pages ──────────────────────────────────────────────────────── */}
        {pages.length > 0 ? (
          <div className="space-y-6">
            {pages.map((page) => {
              const version = page.versions[page.selectedVersionIndex];
              return version ? (
                <figure
                  key={page.pageNumber}
                  className="overflow-hidden rounded-xl border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={version.imageUrl}
                    alt={`Page ${page.pageNumber}`}
                    className="w-full"
                  />
                  <figcaption className="bg-surface px-4 py-2 text-center text-xs text-text-secondary">
                    Page {page.pageNumber}
                  </figcaption>
                </figure>
              ) : null;
            })}
          </div>
        ) : (
          phase === "generating" && (
            <p className="text-center text-sm text-text-secondary">
              Pages will appear as they are generated…
            </p>
          )
        )}

      </div>
    </main>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Spinner({
  className = "",
  "aria-label": ariaLabel,
}: {
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={[
        "inline-block animate-spin rounded-full border-2 border-t-transparent",
        className,
      ].join(" ")}
    />
  );
}

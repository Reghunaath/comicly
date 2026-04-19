"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getComic, generatePage, regeneratePage, selectPageVersion } from "@/frontend/lib/api";
import type { Comic, Page } from "@/frontend/lib/types";
import { MAX_PAGE_REGENERATIONS } from "@/frontend/lib/types";

type Phase =
  | "loading"
  | "load_error"
  | "idle"
  | "generating"
  | "generate_error"
  | "reviewing"
  | "approving"
  | "approve_error";

export default function SupervisedReviewPage({ comicId }: { comicId: string }) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [comic, setComic] = useState<Comic | null>(null);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");

  // -------------------------------------------------------------------------
  // On mount: fetch comic and determine resume point
  // -------------------------------------------------------------------------

  useEffect(() => {
    getComic(comicId)
      .then(({ comic: loaded }) => {
        setComic(loaded);
        const nextPage = loaded.currentPageIndex + 1;
        if (nextPage > loaded.pageCount) {
          router.push(`/comic/${comicId}`);
          return;
        }
        setCurrentPageNum(nextPage);
        const existingPage = loaded.pages.find((p) => p.pageNumber === nextPage);
        if (existingPage && existingPage.versions.length > 0) {
          setCurrentPage(existingPage);
          setSelectedVersionIndex(existingPage.selectedVersionIndex);
          setPhase("reviewing");
        } else {
          setPhase("idle");
        }
      })
      .catch((err: unknown) => {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load comic.");
        setPhase("load_error");
      });
  }, [comicId, router]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function handleGenerate() {
    setPhase("generating");
    setErrorMessage(null);
    try {
      const { page } = await generatePage(comicId, currentPageNum);
      setCurrentPage(page);
      setSelectedVersionIndex(page.versions.length - 1);
      setPhase("reviewing");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Generation failed.");
      setPhase("generate_error");
    }
  }

  async function handleRegenerate() {
    setPhase("generating");
    setErrorMessage(null);
    try {
      const { page } = await regeneratePage(comicId, currentPageNum, regeneratePrompt.trim() || undefined);
      setCurrentPage(page);
      setSelectedVersionIndex(page.versions.length - 1);
      setRegeneratePrompt("");
      setPhase("reviewing");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Regeneration failed.");
      setPhase("generate_error");
    }
  }

  async function handleApprove() {
    if (!currentPage || !comic) return;
    setPhase("approving");
    setErrorMessage(null);
    try {
      await selectPageVersion(comicId, currentPageNum, selectedVersionIndex);
      const nextPage = currentPageNum + 1;
      if (nextPage > comic.pageCount) {
        router.push(`/comic/${comicId}`);
      } else {
        setCurrentPageNum(nextPage);
        setCurrentPage(null);
        setSelectedVersionIndex(0);
        setPhase("idle");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("approve_error");
    }
  }

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const regenerationsUsed = currentPage ? currentPage.versions.length - 1 : 0;
  const canRegenerate = regenerationsUsed < MAX_PAGE_REGENERATIONS;
  const isGenerating = phase === "generating";
  const isApproving = phase === "approving";
  const isLastPage = comic ? currentPageNum === comic.pageCount : false;

  // -------------------------------------------------------------------------
  // Render: loading
  // -------------------------------------------------------------------------

  if (phase === "loading") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-background py-20">
        <Spinner className="h-10 w-10 border-primary" aria-label="Loading comic" />
        <p className="text-sm text-text-secondary">Loading your comic…</p>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Render: load error
  // -------------------------------------------------------------------------

  if (phase === "load_error") {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-4 py-20">
        <div className="w-full max-w-md rounded-2xl border border-error-light bg-error-light px-6 py-8 text-center">
          <p className="mb-1 text-sm font-semibold text-error">Couldn&apos;t load your comic</p>
          <p className="mb-6 text-sm text-error">{errorMessage}</p>
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
  // Render: main review UI
  // -------------------------------------------------------------------------

  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">

        {/* ── Page header ────────────────────────────────────────────────── */}
        <header className="mb-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
            Supervised Mode
          </p>
          <h1 className="text-2xl font-bold text-text">
            {comic?.script?.title ?? "Your Comic"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Page {currentPageNum} of {comic?.pageCount ?? "…"}
          </p>
        </header>

        {/* ── Version thumbnails (shown when >1 version exists) ──────────── */}
        {currentPage && currentPage.versions.length > 1 && (
          <div
            role="group"
            aria-label="Page versions"
            className="mb-4 flex gap-2 overflow-x-auto pb-1"
          >
            {currentPage.versions.map((v, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Version ${i + 1}`}
                aria-pressed={selectedVersionIndex === i}
                onClick={() => setSelectedVersionIndex(i)}
                className={[
                  "relative h-28 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                  selectedVersionIndex === i
                    ? "border-primary"
                    : "border-border hover:border-border-focus",
                ].join(" ")}
              >
                <Image
                  src={v.imageUrl}
                  alt={`Version ${i + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {selectedVersionIndex === i && (
                  <span className="absolute bottom-1 right-1 rounded bg-primary px-1 text-[10px] font-bold text-text-inverse">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Page image preview ─────────────────────────────────────────── */}
        <div className="relative mb-6 w-full overflow-hidden rounded-2xl border border-border bg-surface-alt">
          <div className="aspect-[2/3]">
            {currentPage ? (
              <Image
                src={currentPage.versions[selectedVersionIndex].imageUrl}
                alt={`Page ${currentPageNum}`}
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-3">
                    <Spinner className="h-8 w-8 border-primary" aria-label="Generating page" />
                    <p className="text-sm text-text-secondary">Generating page {currentPageNum}…</p>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">
                    Press &ldquo;Generate Page&rdquo; to create this page.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Regeneration counter ───────────────────────────────────────── */}
        {regenerationsUsed > 0 && (
          <p className="mb-4 text-center text-sm text-text-secondary">
            {regenerationsUsed} of {MAX_PAGE_REGENERATIONS} regenerations used
          </p>
        )}

        {/* ── Error message ──────────────────────────────────────────────── */}
        {(phase === "generate_error" || phase === "approve_error") && errorMessage && (
          <div className="mb-4 rounded-lg border border-error-light bg-error-light px-4 py-3 text-sm text-error">
            {errorMessage}
          </div>
        )}

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {phase === "idle" || (phase === "generate_error" && !currentPage) ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Generate Page
            </button>
          ) : phase === "generate_error" && currentPage ? (
            <>
              {canRegenerate && (
                <textarea
                  value={regeneratePrompt}
                  onChange={(e) => setRegeneratePrompt(e.target.value)}
                  disabled={isGenerating}
                  placeholder="Optional: describe what to change (e.g. 'make the background darker')"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-secondary focus:border-primary focus:outline-none disabled:opacity-60"
                />
              )}
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isGenerating || !canRegenerate}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating && <Spinner className="h-4 w-4 border-text-inverse" />}
                {canRegenerate ? "Retry Regenerate" : "Regeneration limit reached"}
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
              >
                Generate fresh page
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isApproving || isGenerating || !currentPage}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApproving && <Spinner className="h-4 w-4 border-text-inverse" />}
                {isLastPage ? "Approve & Finish" : "Approve & Next"}
              </button>

              {canRegenerate && (
                <textarea
                  value={regeneratePrompt}
                  onChange={(e) => setRegeneratePrompt(e.target.value)}
                  disabled={isGenerating || isApproving}
                  placeholder="Optional: describe what to change (e.g. 'make the background darker')"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-secondary focus:border-primary focus:outline-none disabled:opacity-60"
                />
              )}

              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isGenerating || isApproving || !canRegenerate}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating && <Spinner className="h-4 w-4 border-text" />}
                {canRegenerate
                  ? `Regenerate (${MAX_PAGE_REGENERATIONS - regenerationsUsed} left)`
                  : "Regeneration limit reached"}
              </button>
            </>
          )}
        </div>

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

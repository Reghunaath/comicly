"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getComic, deleteComic, claimComic } from "@/frontend/lib/api";
import { supabase } from "@/frontend/lib/supabase-browser";
import type { Comic } from "@/frontend/lib/types";
import type { User } from "@supabase/supabase-js";
import jsPDF from "jspdf";

type Phase = "loading" | "not_found" | "generating" | "complete" | "error";
type DeletePhase = "idle" | "confirming" | "deleting" | "error";

export default function ComicViewerPage({ comicId }: { comicId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [comic, setComic] = useState<Comic | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [deletePhase, setDeletePhase] = useState<DeletePhase>("idle");
  const [exportingPdf, setExportingPdf] = useState(false);

  // -------------------------------------------------------------------------
  // On mount: fetch comic + auth state in parallel
  // -------------------------------------------------------------------------

  useEffect(() => {
    Promise.all([
      getComic(comicId),
      supabase.auth.getUser(),
    ])
      .then(([{ comic: loaded }, { data: { user } }]) => {
        setComic(loaded);
        setCurrentUser(user);
        setPhase(loaded.status === "complete" ? "complete" : "generating");
        if (user && loaded.userId === null) {
          claimComic(comicId)
            .then(() => {
              setComic(prev => prev ? { ...prev, userId: user.id } : prev);
            })
            .catch(() => undefined);
        }
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
  // Manual status check for comics still generating
  // -------------------------------------------------------------------------

  async function handleCheckStatus() {
    try {
      const { comic: updated } = await getComic(comicId);
      setComic(updated);
      if (updated.status === "complete") setPhase("complete");
    } catch {
      // ignore transient errors
    }
  }

  // -------------------------------------------------------------------------
  // Share handler
  // -------------------------------------------------------------------------

  function handleShare() {
    navigator.clipboard?.writeText(window.location.href)?.catch(() => undefined);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  }

  // -------------------------------------------------------------------------
  // PDF export handler
  // -------------------------------------------------------------------------

  async function handleExportPdf() {
    if (!comic || exportingPdf) return;
    setExportingPdf(true);
    try {
      await exportPDF(comic);
    } catch {
      // On failure, fall back to server-side export
      window.open(`/api/comic/${comicId}/export/pdf`, "_blank");
    } finally {
      setExportingPdf(false);
    }
  }

  // -------------------------------------------------------------------------
  // Delete handlers
  // -------------------------------------------------------------------------

  async function handleConfirmDelete() {
    if (!comic) return;
    setDeletePhase("deleting");
    try {
      await deleteComic(comic.id);
      router.push("/library");
    } catch {
      setDeletePhase("error");
    }
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
  const isOwner = !!(currentUser && comic?.userId && comic.userId === currentUser.id);
  const isGuest = currentUser === null;

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

      {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
      {deletePhase === "confirming" || deletePhase === "deleting" || deletePhase === "error" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface px-6 py-6">
            <p id="delete-dialog-title" className="mb-2 text-base font-semibold text-text">
              Delete this comic?
            </p>
            {deletePhase === "error" ? (
              <p className="mb-5 text-sm text-error">
                Something went wrong. Please try again.
              </p>
            ) : (
              <p className="mb-5 text-sm text-text-secondary">
                This action cannot be undone. The comic and all its pages will be permanently removed.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={deletePhase === "deleting"}
                onClick={() => setDeletePhase("idle")}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-alt disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletePhase === "deleting"}
                onClick={handleConfirmDelete}
                className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {deletePhase === "deleting" ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">

        {/* ── Title bar ──────────────────────────────────────────────────── */}
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
              Comic
            </p>
            <h1 className="text-2xl font-bold text-text">{title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {phase === "complete" && (
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exportingPdf}
                className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-alt disabled:opacity-50"
              >
                {exportingPdf ? "Exporting…" : "Export PDF"}
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-alt"
            >
              Share
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() => setDeletePhase("confirming")}
                className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-surface-alt"
              >
                Delete
              </button>
            )}
          </div>
        </header>

        {/* ── Guest banner ───────────────────────────────────────────────── */}
        {isGuest && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-5 py-4">
            <p className="text-sm text-text-secondary">
              Sign up to save this comic to your library.
            </p>
            <Link
              href={`/auth/signup?redirect=/comic/${comicId}`}
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover"
            >
              Sign up
            </Link>
          </div>
        )}

        {/* ── Generating progress banner ─────────────────────────────────── */}
        {phase === "generating" && (
          <div
            role="status"
            aria-label="Generation in progress"
            className="mb-8 rounded-xl border border-border bg-surface px-5 py-4"
          >
            <p className="text-sm font-medium text-text">
              This comic is still being generated.{" "}
              <button
                type="button"
                onClick={handleCheckStatus}
                className="underline hover:opacity-75"
              >
                Check status
              </button>
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
          null
        )}

      </div>
    </main>
  );
}

// ── PDF export ────────────────────────────────────────────────────────────────

async function exportPDF(comic: Comic) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [800, 1200] });

  for (let i = 0; i < comic.pages.length; i++) {
    const page = comic.pages[i];
    const version = page.versions[page.selectedVersionIndex];
    if (!version) continue;
    if (i > 0) pdf.addPage();
    const dataUrl = await loadImageAsDataUrl(version.imageUrl);
    pdf.addImage(dataUrl, "PNG", 0, 0, 800, 1200);
  }

  pdf.save(`${comic.script?.title ?? "comic"}.pdf`);
}

function loadImageAsDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

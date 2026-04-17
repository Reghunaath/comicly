"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateScript, approveScript, generateAllPages, getComic } from "@/frontend/lib/api";
import type { Script } from "@/frontend/lib/types";

type Phase =
  | "generating_script"
  | "script_error"
  | "ready"
  | "approving"
  | "approve_error"
  | "polling";

export default function ScriptReviewPage({ comicId }: { comicId: string }) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("generating_script");
  const [script, setScript] = useState<Script | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [generatedPages, setGeneratedPages] = useState(0);

  // -------------------------------------------------------------------------
  // On mount: generate the script
  // -------------------------------------------------------------------------

  useEffect(() => {
    generateScript(comicId)
      .then(({ script: generated }) => {
        setScript(generated);
        setPhase("ready");
      })
      .catch((err: unknown) => {
        setScriptError(
          err instanceof Error ? err.message : "Something went wrong."
        );
        setPhase("script_error");
      });
  }, [comicId]);

  // -------------------------------------------------------------------------
  // Polling: check progress every 5s while in "polling" phase
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (phase !== "polling") return;

    const intervalId = setInterval(async () => {
      try {
        const { comic } = await getComic(comicId);
        setGeneratedPages(comic.currentPageIndex);
        if (comic.status === "complete") {
          clearInterval(intervalId);
          router.push(`/comic/${comicId}`);
        }
      } catch {
        // Transient error — keep polling
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [phase, comicId, router]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function handleApprove() {
    setPhase("approving");
    setApproveError(null);
    try {
      await approveScript(comicId);
      setPhase("polling");
      // Fire-and-forget: POST may time out; polling detects completion
      generateAllPages(comicId).catch(() => undefined);
    } catch (err) {
      setApproveError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setPhase("approve_error");
    }
  }

  // -------------------------------------------------------------------------
  // Render: loading
  // -------------------------------------------------------------------------

  if (phase === "generating_script") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-background py-20">
        <Spinner className="h-10 w-10 border-primary" aria-label="Generating script" />
        <p className="text-sm text-text-secondary">Generating your script…</p>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Render: script generation error
  // -------------------------------------------------------------------------

  if (phase === "script_error") {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-4 py-20">
        <div className="w-full max-w-md rounded-2xl border border-error-light bg-error-light px-6 py-8 text-center">
          <p className="mb-1 text-sm font-semibold text-error">
            Couldn&apos;t generate your script
          </p>
          <p className="mb-6 text-sm text-error">{scriptError}</p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover"
          >
            Go back
          </Link>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Render: script display (ready / approving / approve_error / polling)
  // -------------------------------------------------------------------------

  const totalPages = script?.pages.length ?? 0;

  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">

        {/* ── Progress banner (polling only) ─────────────────────────────── */}
        {phase === "polling" && (
          <div
            role="status"
            aria-label="Generation progress"
            className="mb-8 flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4"
          >
            <Spinner className="h-5 w-5 shrink-0 border-primary" />
            <p className="text-sm font-medium text-text">
              Generating page {generatedPages} of {totalPages}…
            </p>
          </div>
        )}

        {/* ── Script ─────────────────────────────────────────────────────── */}
        {script && (
          <article aria-label="Comic script">
            <header className="mb-8">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
                Script
              </p>
              <h1 className="mb-3 text-2xl font-bold text-text">{script.title}</h1>
              <p className="text-sm leading-relaxed text-text-secondary">{script.synopsis}</p>
            </header>

            <div className="space-y-8">
              {script.pages.map((page) => (
                <section key={page.pageNumber} aria-label={`Page ${page.pageNumber}`}>
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-secondary">
                    Page {page.pageNumber}
                  </h2>

                  <div className="space-y-4">
                    {page.panels.map((panel) => (
                      <div
                        key={panel.panelNumber}
                        className="rounded-xl border border-border bg-surface p-4"
                      >
                        <p className="mb-1 text-xs font-semibold text-text-secondary">
                          Panel {panel.panelNumber}
                        </p>
                        <p className="mb-3 text-sm text-text">{panel.description}</p>

                        {panel.caption && (
                          <p className="mb-3 text-sm italic text-text-secondary">
                            &ldquo;{panel.caption}&rdquo;
                          </p>
                        )}

                        {panel.dialogue.length > 0 && (
                          <ul className="space-y-1">
                            {panel.dialogue.map((line, i) => (
                              <li key={i} className="text-sm text-text">
                                <span className="font-semibold">{line.speaker}:</span>{" "}
                                {line.text}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>
        )}

        {/* ── Approve error ───────────────────────────────────────────────── */}
        {approveError && (
          <div className="mt-6 rounded-lg border border-error-light bg-error-light px-4 py-3 text-sm text-error">
            {approveError}
          </div>
        )}

        {/* ── Action button (hidden during polling) ──────────────────────── */}
        {phase !== "polling" && (
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={handleApprove}
              disabled={phase === "approving"}
              className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {phase === "approving" && (
                <Spinner className="h-4 w-4 border-text-inverse" />
              )}
              Approve &amp; Generate
            </button>
          </div>
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

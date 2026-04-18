"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  generateScript,
  regenerateScript,
  approveScript,
  generateAllPages,
  getComic,
} from "@/frontend/lib/api";
import type { GenerationMode, Script } from "@/frontend/lib/types";

type Phase =
  | "generating_script"
  | "script_error"
  | "ready"
  | "regenerating"
  | "approving"
  | "approve_error"
  | "polling";

export default function ScriptReviewPage({ comicId }: { comicId: string }) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("generating_script");
  const [script, setScript] = useState<Script | null>(null);
  const [editableScript, setEditableScript] = useState<Script | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showRegenInput, setShowRegenInput] = useState(false);
  const [regenFeedback, setRegenFeedback] = useState("");
  const [selectedMode, setSelectedMode] = useState<GenerationMode | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [generatedPages, setGeneratedPages] = useState(0);

  // -------------------------------------------------------------------------
  // On mount: generate the script
  // -------------------------------------------------------------------------

  useEffect(() => {
    generateScript(comicId)
      .then(({ script: generated }) => {
        setScript(generated);
        setEditableScript(structuredClone(generated));
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
  // Edit handlers
  // -------------------------------------------------------------------------

  function startEditing() {
    setEditableScript(structuredClone(script));
    setIsEditing(true);
  }

  function saveEdits() {
    setScript(editableScript);
    setIsEditing(false);
  }

  function cancelEdits() {
    setEditableScript(structuredClone(script));
    setIsEditing(false);
  }

  // -------------------------------------------------------------------------
  // Regenerate handler
  // -------------------------------------------------------------------------

  async function handleRegenerate() {
    setPhase("regenerating");
    setRegenError(null);
    try {
      const { script: regenerated } = await regenerateScript(comicId, regenFeedback);
      setScript(regenerated);
      setEditableScript(structuredClone(regenerated));
      setRegenFeedback("");
      setShowRegenInput(false);
      setPhase("ready");
    } catch (err) {
      setRegenError(
        err instanceof Error ? err.message : "Something went wrong."
      );
      setPhase("ready");
    }
  }

  // -------------------------------------------------------------------------
  // Approve handler
  // -------------------------------------------------------------------------

  async function handleApprove() {
    if (!selectedMode || !script) return;
    setPhase("approving");
    setApproveError(null);
    try {
      await approveScript(comicId, selectedMode, script);
      if (selectedMode === "supervised") {
        router.push(`/review/${comicId}`);
      } else {
        setPhase("polling");
        // Fire-and-forget: POST may time out; polling detects completion
        generateAllPages(comicId).catch(() => undefined);
      }
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
  // Render: script display + controls
  // -------------------------------------------------------------------------

  const displayScript = isEditing ? editableScript : script;
  const totalPages = displayScript?.pages.length ?? 0;
  const isActionDisabled = phase === "regenerating" || phase === "approving";

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
        {displayScript && (
          <article aria-label="Comic script">
            <header className="mb-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
                Script
              </p>

              {isEditing ? (
                <>
                  <input
                    aria-label="Script title"
                    value={editableScript?.title ?? ""}
                    onChange={(e) =>
                      setEditableScript((prev) =>
                        prev ? { ...prev, title: e.target.value } : prev
                      )
                    }
                    className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-2xl font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <textarea
                    aria-label="Script synopsis"
                    value={editableScript?.synopsis ?? ""}
                    onChange={(e) =>
                      setEditableScript((prev) =>
                        prev ? { ...prev, synopsis: e.target.value } : prev
                      )
                    }
                    rows={3}
                    className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </>
              ) : (
                <>
                  <h1 className="mb-3 text-2xl font-bold text-text">{displayScript.title}</h1>
                  <p className="text-sm leading-relaxed text-text-secondary">{displayScript.synopsis}</p>
                </>
              )}
            </header>

            {/* ── Edit / Done / Cancel controls ─────────────────────────── */}
            {phase !== "polling" && (
              <div className="mb-6 flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={saveEdits}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdits}
                      className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-hover"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={startEditing}
                      disabled={isActionDisabled}
                      className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRegenInput((v) => !v)}
                      disabled={isActionDisabled}
                      className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Regenerate
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── Regenerate input panel ─────────────────────────────────── */}
            {showRegenInput && !isEditing && phase !== "polling" && (
              <div className="mb-6 rounded-xl border border-border bg-surface p-4">
                <p className="mb-2 text-sm font-medium text-text">
                  What should be changed?
                </p>
                <textarea
                  aria-label="Regeneration feedback"
                  value={regenFeedback}
                  onChange={(e) => setRegenFeedback(e.target.value)}
                  placeholder="Make the villain more sympathetic…"
                  rows={3}
                  className="mb-3 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {regenError && (
                  <p className="mb-2 text-sm text-error">{regenError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={phase === "regenerating"}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {phase === "regenerating" && (
                      <Spinner className="h-4 w-4 border-text-inverse" />
                    )}
                    Regenerate Script
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRegenInput(false);
                      setRegenError(null);
                    }}
                    disabled={phase === "regenerating"}
                    className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── Pages ─────────────────────────────────────────────────── */}
            <div className="space-y-8">
              {displayScript.pages.map((page, pageIdx) => (
                <section key={page.pageNumber} aria-label={`Page ${page.pageNumber}`}>
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-secondary">
                    Page {page.pageNumber}
                  </h2>

                  <div className="space-y-4">
                    {page.panels.map((panel, panelIdx) => (
                      <div
                        key={panel.panelNumber}
                        className="rounded-xl border border-border bg-surface p-4"
                      >
                        <p className="mb-1 text-xs font-semibold text-text-secondary">
                          Panel {panel.panelNumber}
                        </p>

                        {isEditing ? (
                          <textarea
                            aria-label={`Page ${page.pageNumber} panel ${panel.panelNumber} description`}
                            value={
                              editableScript?.pages[pageIdx]?.panels[panelIdx]
                                ?.description ?? ""
                            }
                            onChange={(e) =>
                              setEditableScript((prev) => {
                                if (!prev) return prev;
                                const pages = prev.pages.map((p, pi) =>
                                  pi === pageIdx
                                    ? {
                                        ...p,
                                        panels: p.panels.map((pn, pni) =>
                                          pni === panelIdx
                                            ? { ...pn, description: e.target.value }
                                            : pn
                                        ),
                                      }
                                    : p
                                );
                                return { ...prev, pages };
                              })
                            }
                            rows={2}
                            className="mb-3 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        ) : (
                          <p className="mb-3 text-sm text-text">{panel.description}</p>
                        )}

                        {isEditing ? (
                          <input
                            aria-label={`Page ${page.pageNumber} panel ${panel.panelNumber} caption`}
                            value={
                              editableScript?.pages[pageIdx]?.panels[panelIdx]
                                ?.caption ?? ""
                            }
                            onChange={(e) =>
                              setEditableScript((prev) => {
                                if (!prev) return prev;
                                const pages = prev.pages.map((p, pi) =>
                                  pi === pageIdx
                                    ? {
                                        ...p,
                                        panels: p.panels.map((pn, pni) =>
                                          pni === panelIdx
                                            ? {
                                                ...pn,
                                                caption: e.target.value || undefined,
                                              }
                                            : pn
                                        ),
                                      }
                                    : p
                                );
                                return { ...prev, pages };
                              })
                            }
                            placeholder="Caption (optional)"
                            className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm italic text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        ) : (
                          panel.caption && (
                            <p className="mb-3 text-sm italic text-text-secondary">
                              &ldquo;{panel.caption}&rdquo;
                            </p>
                          )
                        )}

                        {panel.dialogue.length > 0 && (
                          <ul className="space-y-1">
                            {panel.dialogue.map((line, lineIdx) => (
                              <li key={lineIdx} className="text-sm text-text">
                                {isEditing ? (
                                  <div className="grid grid-cols-[10rem_1fr] gap-2">
                                    <input
                                      aria-label={`Page ${page.pageNumber} panel ${panel.panelNumber} line ${lineIdx + 1} speaker`}
                                      value={
                                        editableScript?.pages[pageIdx]?.panels[
                                          panelIdx
                                        ]?.dialogue[lineIdx]?.speaker ?? ""
                                      }
                                      onChange={(e) =>
                                        setEditableScript((prev) => {
                                          if (!prev) return prev;
                                          const pages = prev.pages.map((p, pi) =>
                                            pi === pageIdx
                                              ? {
                                                  ...p,
                                                  panels: p.panels.map((pn, pni) =>
                                                    pni === panelIdx
                                                      ? {
                                                          ...pn,
                                                          dialogue: pn.dialogue.map(
                                                            (dl, li) =>
                                                              li === lineIdx
                                                                ? { ...dl, speaker: e.target.value }
                                                                : dl
                                                          ),
                                                        }
                                                      : pn
                                                  ),
                                                }
                                              : p
                                          );
                                          return { ...prev, pages };
                                        })
                                      }
                                      className="min-w-0 rounded-lg border border-border bg-background px-2 py-1 text-sm font-semibold text-text focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <input
                                      aria-label={`Page ${page.pageNumber} panel ${panel.panelNumber} line ${lineIdx + 1} text`}
                                      value={
                                        editableScript?.pages[pageIdx]?.panels[
                                          panelIdx
                                        ]?.dialogue[lineIdx]?.text ?? ""
                                      }
                                      onChange={(e) =>
                                        setEditableScript((prev) => {
                                          if (!prev) return prev;
                                          const pages = prev.pages.map((p, pi) =>
                                            pi === pageIdx
                                              ? {
                                                  ...p,
                                                  panels: p.panels.map((pn, pni) =>
                                                    pni === panelIdx
                                                      ? {
                                                          ...pn,
                                                          dialogue: pn.dialogue.map(
                                                            (dl, li) =>
                                                              li === lineIdx
                                                                ? { ...dl, text: e.target.value }
                                                                : dl
                                                          ),
                                                        }
                                                      : pn
                                                  ),
                                                }
                                              : p
                                          );
                                          return { ...prev, pages };
                                        })
                                      }
                                      className="min-w-0 rounded-lg border border-border bg-background px-2 py-1 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-semibold">{line.speaker}:</span>{" "}
                                    {line.text}
                                  </>
                                )}
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

        {/* ── Mode selection + Approve (hidden during polling / editing) ─── */}
        {phase !== "polling" && !isEditing && (
          <>
            <div className="mt-8" role="group" aria-label="Generation mode">
              <p className="mb-3 text-sm font-medium text-text">
                How would you like to generate your comic?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  role="radio"
                  aria-label="Automated mode"
                  aria-checked={selectedMode === "automated"}
                  onClick={() => setSelectedMode("automated")}
                  disabled={isActionDisabled}
                  className={[
                    "rounded-xl border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    selectedMode === "automated"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-surface hover:border-primary/50",
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold text-text">Automated</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    All pages generated at once
                  </p>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-label="Supervised mode"
                  aria-checked={selectedMode === "supervised"}
                  onClick={() => setSelectedMode("supervised")}
                  disabled={isActionDisabled}
                  className={[
                    "rounded-xl border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    selectedMode === "supervised"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-surface hover:border-primary/50",
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold text-text">Supervised</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Review each page as it&apos;s generated
                  </p>
                </button>
              </div>
            </div>

            {/* ── Approve error ──────────────────────────────────────────── */}
            {approveError && (
              <div className="mt-6 rounded-lg border border-error-light bg-error-light px-4 py-3 text-sm text-error">
                {approveError}
              </div>
            )}

            {/* ── Approve button ─────────────────────────────────────────── */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleApprove}
                disabled={!selectedMode || isActionDisabled}
                className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {phase === "approving" && (
                  <Spinner className="h-4 w-4 border-text-inverse" />
                )}
                {selectedMode === "automated" ? "Approve & Generate" : "Approve"}
              </button>
            </div>
          </>
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

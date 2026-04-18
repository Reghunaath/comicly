"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getComic, refineComic } from "@/frontend/lib/api";
import type { FollowUpQuestion } from "@/frontend/lib/types";

type FetchState = "loading" | "error" | "ready";

export default function QAPage({ comicId }: { comicId: string }) {
  const router = useRouter();

  const [fetchState, setFetchState] = useState<FetchState>("loading");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // -------------------------------------------------------------------------

  useEffect(() => {
    getComic(comicId)
      .then(({ comic }) => {
        setQuestions(comic.followUpQuestions ?? []);
        setFetchState("ready");
      })
      .catch((err: unknown) => {
        setFetchError(
          err instanceof Error ? err.message : "Something went wrong."
        );
        setFetchState("error");
      });
  }, [comicId]);

  // -------------------------------------------------------------------------

  async function handleSkipAll() {
    setSubmitLoading(true);
    setErrorMessage(null);
    try {
      await refineComic(comicId, {});
      router.push(`/script/${comicId}`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setSubmitLoading(false);
    }
  }

  async function handleSubmit() {
    setSubmitLoading(true);
    setErrorMessage(null);
    try {
      await refineComic(comicId, answers);
      router.push(`/script/${comicId}`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setSubmitLoading(false);
    }
  }

  // -------------------------------------------------------------------------

  if (fetchState === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center bg-background py-20">
        <Spinner className="h-8 w-8 border-primary" aria-label="Loading questions" />
      </main>
    );
  }

  if (fetchState === "error") {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-4 py-20">
        <div className="w-full max-w-md rounded-2xl border border-error-light bg-error-light px-6 py-8 text-center">
          <p className="mb-1 text-sm font-semibold text-error">
            Couldn&apos;t load your comic
          </p>
          <p className="mb-6 text-sm text-error">{fetchError}</p>
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

  // ready
  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">

        {/* ── Heading ───────────────────────────────────────────────────── */}
        <section aria-label="Follow-up questions" className="mb-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
            Tell us more
          </p>
          <p className="text-sm text-text-secondary">
            All questions are optional — skip any you&apos;d like.
          </p>
        </section>

        {/* ── Question list ─────────────────────────────────────────────── */}
        {questions.length > 0 ? (
          <ol className="mb-10 space-y-6">
            {questions.map((q, idx) => (
              <li key={q.id}>
                <label
                  htmlFor={`q-${q.id}`}
                  className="mb-2 block text-sm font-medium text-text"
                >
                  <span className="mr-2 font-bold text-primary">{idx + 1}.</span>
                  {q.question}
                </label>
                <input
                  id={`q-${q.id}`}
                  type="text"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAnswers((prev) =>
                      val ? { ...prev, [q.id]: val } : Object.fromEntries(
                        Object.entries(prev).filter(([k]) => k !== q.id)
                      )
                    );
                  }}
                  disabled={submitLoading}
                  placeholder="Your answer (optional)"
                  className={[
                    "w-full rounded-xl border bg-surface px-4 py-3 text-sm text-text",
                    "placeholder:text-muted transition-shadow",
                    "focus:outline-none focus:ring-2 focus:ring-border-focus",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    "border-border",
                  ].join(" ")}
                />
              </li>
            ))}
          </ol>
        ) : (
          <p className="mb-10 text-sm text-text-secondary">
            No follow-up questions — you&apos;re all set!
          </p>
        )}

        {/* ── Submit error ──────────────────────────────────────────────── */}
        {errorMessage && (
          <div className="mb-6 rounded-lg border border-error-light bg-error-light px-4 py-3 text-sm text-error">
            {errorMessage}
          </div>
        )}

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleSkipAll}
            disabled={submitLoading}
            className="flex items-center gap-1.5 rounded-xl border border-secondary px-6 py-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary hover:text-text-inverse disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitLoading && (
              <Spinner className="h-4 w-4 border-secondary" />
            )}
            Skip All
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitLoading}
            className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitLoading && (
              <Spinner className="h-4 w-4 border-text-inverse" />
            )}
            Submit
          </button>
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

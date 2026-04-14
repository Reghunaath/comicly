"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createComic, getRandomIdea } from "@/frontend/lib/api";
import { ART_STYLES, MAX_PAGES, MIN_PAGES, type ArtStylePreset } from "@/frontend/lib/types";
import ArtStyleCard from "./ArtStyleCard";

const PAGE_TICKS = [1, 3, 5, 7, 9, 11, 13, 15];

export default function LandingPage() {
  const router = useRouter();

  // Form state
  const [prompt, setPrompt] = useState("");
  const [artStyle, setArtStyle] = useState<ArtStylePreset>("manga");
  const [customStylePrompt, setCustomStylePrompt] = useState("");
  const [pageCount, setPageCount] = useState(5);

  // UI state
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [errors, setErrors] = useState<{
    prompt?: string;
    customStyle?: string;
    form?: string;
  }>({});

  // -------------------------------------------------------------------------

  async function handleSurpriseMe() {
    setSurpriseLoading(true);
    try {
      const { idea } = await getRandomIdea();
      setPrompt(idea);
      setErrors((prev) => ({ ...prev, prompt: undefined }));
    } catch {
      // Non-blocking — user can still type manually
    } finally {
      setSurpriseLoading(false);
    }
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!prompt.trim()) next.prompt = "Please describe your comic idea.";
    if (artStyle === "custom" && !customStylePrompt.trim()) {
      next.customStyle = "Please describe your custom art style.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    setCreateLoading(true);
    try {
      const { comicId } = await createComic({
        prompt: prompt.trim(),
        artStyle,
        customStylePrompt:
          artStyle === "custom" ? customStylePrompt.trim() : undefined,
        pageCount,
      });
      router.push(`/create?id=${comicId}`);
    } catch (err) {
      setErrors({
        form:
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      });
      setCreateLoading(false);
    }
  }

  // -------------------------------------------------------------------------

  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">

        {/* ── Surprise Me + Prompt ──────────────────────────────────────── */}
        <section aria-label="Comic idea" className="mb-8">
          {/* Row: label left, Surprise Me right */}
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="prompt"
              className="text-sm font-medium text-text"
            >
              What&apos;s your comic idea?
            </label>
            <button
              type="button"
              onClick={handleSurpriseMe}
              disabled={surpriseLoading || createLoading}
              className="flex items-center gap-1.5 rounded-lg border border-secondary bg-white px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-secondary hover:text-text-inverse disabled:cursor-not-allowed disabled:opacity-50"
            >
              {surpriseLoading ? (
                <Spinner className="h-3 w-3 border-secondary" />
              ) : (
                <span aria-hidden>✦</span>
              )}
              Surprise Me
            </button>
          </div>

          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (errors.prompt)
                setErrors((prev) => ({ ...prev, prompt: undefined }));
            }}
            placeholder="A detective cat solves mysteries in a steampunk city…"
            rows={5}
            disabled={createLoading}
            className={[
              "w-full resize-none rounded-xl border bg-surface px-4 py-3 text-sm text-text",
              "placeholder:text-muted transition-shadow",
              "focus:outline-none focus:ring-2 focus:ring-border-focus",
              "disabled:cursor-not-allowed disabled:opacity-60",
              errors.prompt
                ? "border-error focus:ring-error"
                : "border-border",
            ].join(" ")}
          />
          {errors.prompt && (
            <p className="mt-1.5 text-xs text-error">{errors.prompt}</p>
          )}
        </section>

        {/* ── Art style selector ────────────────────────────────────────── */}
        <section
          aria-label="Art style"
          className="mb-8 rounded-2xl bg-surface-alt px-6 py-5"
        >
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-text-secondary">
            Pick your style
          </p>

          <div className="grid grid-cols-3 gap-3">
            {ART_STYLES.map((style) => (
              <ArtStyleCard
                key={style.key}
                style={style}
                selected={artStyle === style.key}
                onSelect={() => setArtStyle(style.key)}
              />
            ))}
          </div>

          {/* Custom style prompt — shown only when custom is selected */}
          {artStyle === "custom" && (
            <div className="mt-4">
              <label
                htmlFor="custom-style"
                className="mb-1.5 block text-xs font-medium text-text-secondary"
              >
                Describe your style
              </label>
              <input
                id="custom-style"
                type="text"
                value={customStylePrompt}
                onChange={(e) => {
                  setCustomStylePrompt(e.target.value);
                  if (errors.customStyle)
                    setErrors((prev) => ({
                      ...prev,
                      customStyle: undefined,
                    }));
                }}
                placeholder="e.g. Studio Ghibli cel animation with pastel tones"
                disabled={createLoading}
                className={[
                  "w-full rounded-xl border bg-surface px-4 py-3 text-sm text-text",
                  "placeholder:text-muted transition-shadow",
                  "focus:outline-none focus:ring-2 focus:ring-border-focus",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  errors.customStyle
                    ? "border-error focus:ring-error"
                    : "border-border",
                ].join(" ")}
              />
              {errors.customStyle && (
                <p className="mt-1.5 text-xs text-error">
                  {errors.customStyle}
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Page count ────────────────────────────────────────────────── */}
        <section aria-label="Page count" className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-text">How many pages?</p>
            <span className="min-w-6 text-right text-sm font-bold text-primary">
              {pageCount}
            </span>
          </div>

          <input
            type="range"
            min={MIN_PAGES}
            max={MAX_PAGES}
            step={1}
            value={pageCount}
            onChange={(e) => setPageCount(Number(e.target.value))}
            disabled={createLoading}
            className="w-full accent-primary disabled:opacity-60"
            aria-valuemin={MIN_PAGES}
            aria-valuemax={MAX_PAGES}
            aria-valuenow={pageCount}
            aria-label="Number of pages"
          />

          {/* Tick labels */}
          <div className="mt-1 flex justify-between px-0.5">
            {PAGE_TICKS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPageCount(n)}
                disabled={createLoading}
                className={[
                  "text-xs transition-colors",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  pageCount === n
                    ? "font-semibold text-primary"
                    : "text-text-secondary hover:text-text",
                ].join(" ")}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* ── Form-level error ──────────────────────────────────────────── */}
        {errors.form && (
          <div className="mb-4 rounded-lg border border-error-light bg-error-light px-4 py-3 text-sm text-error">
            {errors.form}
          </div>
        )}

        {/* ── Create Comic ──────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCreate}
            disabled={createLoading || surpriseLoading}
            className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-semibold text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createLoading && (
              <Spinner className="h-4 w-4 border-text-inverse" />
            )}
            Create Comic
          </button>
        </div>
      </div>
    </main>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={[
        "inline-block animate-spin rounded-full border-2 border-t-transparent",
        className,
      ].join(" ")}
    />
  );
}

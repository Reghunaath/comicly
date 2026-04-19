"use client";

import { useState } from "react";
import type { ComicSummary, ComicStatus } from "@/frontend/lib/types";
import { ART_STYLES } from "@/frontend/lib/types";

interface Props {
  comic: ComicSummary;
  onNavigate: (comic: ComicSummary) => void;
  onDelete: (id: string) => Promise<void>;
}

function getStatusBadge(status: ComicStatus): { label: string; className: string } {
  if (status === "complete") {
    return { label: "Complete", className: "bg-green-100 text-green-800" };
  }
  if (status === "generating") {
    return { label: "Generating...", className: "bg-yellow-100 text-yellow-800" };
  }
  return { label: "Draft", className: "bg-gray-100 text-gray-600" };
}

function getArtStyleLabel(key: string): string {
  return ART_STYLES.find((s) => s.key === key)?.label ?? key;
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} minute${mins !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

export default function ComicCard({ comic, onNavigate, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const badge = getStatusBadge(comic.status);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(true);
    try {
      await onDelete(comic.id);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-md cursor-pointer"
      onClick={() => onNavigate(comic)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-surface-raised">
        {comic.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={comic.thumbnailUrl}
            alt={comic.title ?? "Comic thumbnail"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-text-muted">
            No preview
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-text">
          {comic.title ?? "Untitled"}
        </h3>
        <div className="flex flex-wrap items-center gap-1 text-xs text-text-secondary">
          <span className={`rounded-full px-2 py-0.5 font-medium ${badge.className}`}>
            {badge.label}
          </span>
          <span className="text-text-muted">·</span>
          <span>{getArtStyleLabel(comic.artStyle)}</span>
          <span className="text-text-muted">·</span>
          <span>{comic.pageCount} {comic.pageCount === 1 ? "page" : "pages"}</span>
        </div>
        <p className="text-xs text-text-muted">{relativeDate(comic.createdAt)}</p>
      </div>

      {/* Delete button — appears on hover */}
      <div
        className="absolute right-2 top-2"
        onClick={(e) => e.stopPropagation()}
      >
        {confirming ? (
          <div className="flex gap-1 rounded-lg bg-surface p-1 shadow-md border border-border">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-60"
            >
              {deleting ? "..." : "Delete"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
              className="rounded border border-border bg-surface px-2 py-1 text-xs font-medium text-text hover:bg-surface-raised"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
            className="rounded-full bg-black/40 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
            aria-label="Delete comic"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

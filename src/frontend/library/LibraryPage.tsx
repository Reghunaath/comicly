"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/frontend/lib/supabase-browser";
import { getLibraryComics, deleteComic } from "@/frontend/lib/api";
import type { ComicSummary } from "@/frontend/lib/types";
import ComicCard from "./ComicCard";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

function getComicHref(comic: ComicSummary): string {
  if (comic.status === "input") return `/create?id=${comic.id}`;
  if (comic.status === "script_pending" || comic.status === "script_draft") {
    return `/script/${comic.id}`;
  }
  if (comic.status === "script_approved") return `/review/${comic.id}`;
  return `/comic/${comic.id}`;
}

export default function LibraryPage() {
  const router = useRouter();
  const [comics, setComics] = useState<ComicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { comics: fetched } = await getLibraryComics();
      setComics(
        [...fetched].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (USE_MOCK) {
      loadLibrary();
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/auth/login?redirect=/library");
        return;
      }
      loadLibrary();
    });
  }, [router, loadLibrary]);

  async function handleDelete(id: string) {
    await deleteComic(id);
    setComics((prev) => prev.filter((c) => c.id !== id));
  }

  function handleNavigate(comic: ComicSummary) {
    router.push(getComicHref(comic));
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-text-muted">{error}</p>
        <button
          onClick={loadLibrary}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">My Library</h1>
        <Link
          href="/"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover"
        >
          Create New Comic
        </Link>
      </div>

      {comics.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg font-medium text-text">No comics yet</p>
          <p className="text-sm text-text-muted">Your created comics will appear here.</p>
          <Link
            href="/"
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover"
          >
            Create your first comic
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {comics.map((comic) => (
            <ComicCard
              key={comic.id}
              comic={comic}
              onNavigate={handleNavigate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </main>
  );
}

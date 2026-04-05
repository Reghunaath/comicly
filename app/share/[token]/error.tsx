"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <p>Failed to load comic.</p>
      <button onClick={reset}>Retry</button>
    </div>
  );
}

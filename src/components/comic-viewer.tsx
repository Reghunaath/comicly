"use client";

import Image from "next/image";
import { useState } from "react";

const PANELS = [
  {
    id: 1,
    image: "/DOGE.jpg",
    dialogue: "I have discovered the ancient art of being both dog AND frog.",
  },
  {
    id: 2,
    image: "/DOGE.jpg",
    dialogue: "My enemies cannot comprehend my dual nature.",
  },
  {
    id: 3,
    image: "/DOGE.jpg",
    dialogue: "I leap. I woof. I am inevitable.",
  },
  {
    id: 4,
    image: "/DOGE.jpg",
    dialogue: "...much amphibian. very wow.",
  },
];

const REACTIONS = [
  { emoji: "😂", label: "Funny" },
  { emoji: "❤️", label: "Love" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "🐸", label: "Frog" },
];

export default function ComicViewer() {
  const [currentPanel, setCurrentPanel] = useState(0);
  const [reactions, setReactions] = useState<Record<string, number>>({
    "😂": 42,
    "❤️": 17,
    "🔥": 8,
    "🐸": 31,
  });
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const panel = PANELS[currentPanel];
  const isFirst = currentPanel === 0;
  const isLast = currentPanel === PANELS.length - 1;

  function handleReaction(emoji: string) {
    setReactions((prev) => {
      const next = { ...prev };
      if (activeReaction === emoji) {
        next[emoji] = (next[emoji] ?? 0) - 1;
        setActiveReaction(null);
      } else {
        if (activeReaction) next[activeReaction] = (next[activeReaction] ?? 0) - 1;
        next[emoji] = (next[emoji] ?? 0) + 1;
        setActiveReaction(emoji);
      }
      return next;
    });
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center py-10 px-4">
      {/* Header */}
      <div className="w-full max-w-xl mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          DOGE: The Frog Whisperer
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          4 panels · Comedy · By <span className="text-white">Qingyang</span>
        </p>
      </div>

      {/* Panel */}
      <div className="w-full max-w-xl bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-xl">
        <div className="relative w-full aspect-square bg-zinc-800 flex items-center justify-center">
          <Image
            src={panel.image}
            alt={`Panel ${panel.id}`}
            width={480}
            height={480}
            priority
            className="object-contain max-h-full p-6"
          />
          {/* Panel number badge */}
          <span className="absolute top-3 left-3 bg-black/60 text-xs px-2 py-1 rounded-full">
            {currentPanel + 1} / {PANELS.length}
          </span>
        </div>

        {/* Dialogue */}
        <div className="px-6 py-4 border-t border-zinc-800">
          <p className="text-base italic text-zinc-200">&ldquo;{panel.dialogue}&rdquo;</p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 pb-5">
          <button
            onClick={() => setCurrentPanel((p) => p - 1)}
            disabled={isFirst}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition"
          >
            ← Prev
          </button>

          {/* Panel dots */}
          <div className="flex gap-2">
            {PANELS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPanel(i)}
                className={`w-2 h-2 rounded-full transition ${
                  i === currentPanel ? "bg-white" : "bg-zinc-600 hover:bg-zinc-400"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentPanel((p) => p + 1)}
            disabled={isLast}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Reactions */}
      <div className="w-full max-w-xl mt-4 flex gap-3">
        {REACTIONS.map(({ emoji, label }) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            title={label}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition border ${
              activeReaction === emoji
                ? "bg-zinc-700 border-zinc-500"
                : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
            }`}
          >
            <span>{emoji}</span>
            <span className="text-zinc-300">{reactions[emoji]}</span>
          </button>
        ))}
      </div>

      {/* Story description */}
      <div className="w-full max-w-xl mt-6 bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Story
        </h2>
        <p className="text-zinc-300 text-sm leading-relaxed">
          When a regular dog stumbles into an ancient frog temple, something
          extraordinary happens. Fused by mysterious amphibian magic, DOGE
          awakens as a being of two worlds — four-legged, web-footed, and
          deeply confused. Follow their journey across the backyard, the pond,
          and that weird corner behind the shed.
        </p>
      </div>

      {/* Share */}
      <div className="w-full max-w-xl mt-4 flex justify-end">
        <button
          onClick={handleShare}
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm transition"
        >
          {copied ? "Link copied!" : "Share"}
        </button>
      </div>
    </div>
  );
}

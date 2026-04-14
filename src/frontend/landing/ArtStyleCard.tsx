"use client";

import type { ArtStyleMeta } from "@/frontend/lib/types";

// Representative colors that evoke each art style aesthetic
const STYLE_BG: Record<string, string> = {
  manga: "#D62828",
  western_comic: "#1D3A6E",
  watercolor_storybook: "#3A86A8",
  minimalist_flat: "#2D2D2D",
  vintage_newspaper: "#7A6145",
  custom: "#4A3AA8",
};

interface ArtStyleCardProps {
  style: ArtStyleMeta;
  selected: boolean;
  onSelect: () => void;
}

export default function ArtStyleCard({
  style,
  selected,
  onSelect,
}: ArtStyleCardProps) {
  const bg = STYLE_BG[style.key] ?? "#4A3AA8";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        "relative flex min-h-28 w-full flex-col justify-between overflow-hidden rounded-xl text-left transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2",
        selected
          ? "ring-2 ring-primary ring-offset-2"
          : "ring-1 ring-transparent hover:ring-border",
      ].join(" ")}
      style={{ backgroundColor: bg }}
    >
      {/* Selected badge */}
      {selected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-text-inverse">
          ✓
        </span>
      )}

      {/* Text overlay */}
      <div className="p-3">
        <p className="text-sm font-bold text-white drop-shadow">{style.label}</p>
        <p className="mt-1 text-[11px] leading-snug text-white/75 line-clamp-3">
          {style.description}
        </p>
      </div>
    </button>
  );
}

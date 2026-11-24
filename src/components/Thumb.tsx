import { useState } from "react";
import { PlayIcon } from "@/components/icons";

/**
 * A video thumbnail: a plain <img> that fills its box (the box sets the size
 * and position: relative), loads lazily unless `eager`, and decodes off the
 * main thread. Never a <video>: grids only ever load the small picture.
 *
 * With no picture (empty `src`) or one that fails to load, a clean
 * placeholder shows instead, and the video file is never touched.
 */
export function Thumb({ src, alt, sizes, eager = false, className = "" }: { src: string; alt: string; sizes?: string; eager?: boolean; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return <ThumbPlaceholder />;
  return (
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : undefined}
      className={`absolute inset-0 h-full w-full object-cover text-transparent ${className}`}
      onError={() => setFailed(src)}
      // An image that already failed before the page came alive never fires onError: catch it here.
      ref={(img) => {
        if (img && img.complete && img.naturalWidth === 0 && img.currentSrc) setFailed(src);
      }}
    />
  );
}

/** Shown where a video has no thumbnail picture. */
export function ThumbPlaceholder() {
  return (
    <span aria-hidden data-thumb-placeholder className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[var(--hover)] to-[var(--active)] text-text-2">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--surface)]/70">
        <PlayIcon className="h-6 w-6 opacity-70" />
      </span>
    </span>
  );
}

/** How wide a card in the home grid shows (videoGridClass in VideoCard.tsx). */
export const GRID_SIZES = "(min-width: 1800px) 20vw, (min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

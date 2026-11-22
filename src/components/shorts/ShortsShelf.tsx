"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SnipsMark } from "@/components/icons";
import type { Short } from "@/lib/shorts/types";
import { ShortCard } from "./ShortCard";

/**
 * The Snips shelf on the home feed, 2020 style: the red mark and "Snips"
 * over one row of vertical thumbnails that scrolls sideways. It spans every
 * column of the grid (see lib/shorts/shelf.ts for where it sits).
 */
export function ShortsShelf({ shorts }: { shorts: Short[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });

  const updateScrollState = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const next = { left: el.scrollLeft > 2, right: el.scrollLeft < max - 2 };
    setScrollState((current) =>
      current.left === next.left && current.right === next.right ? current : next,
    );
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollState) : null;
    observer?.observe(el);
    Array.from(el.children).forEach((child) => observer?.observe(child));

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      observer?.disconnect();
    };
  }, [shorts.length, updateScrollState]);

  const scroll = (direction: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.max(el.clientWidth * 0.75, 220),
      behavior: "smooth",
    });
  };

  return (
    <section className="col-span-full my-2 border-y border-divider py-5" data-shorts-shelf={shorts.length} aria-labelledby="shorts-shelf-title">
      <h2 id="shorts-shelf-title" className="mb-4 flex items-center gap-2 px-3 text-[20px] font-medium leading-7 text-text sm:px-0">
        <SnipsMark className="h-7 w-7" />
        Snips
      </h2>
      <div className="relative">
        <div
          id="snips-shelf-scroller"
          ref={scroller}
          onScroll={updateScrollState}
          className="flex snap-x scroll-px-3 gap-3 overflow-x-auto scroll-smooth px-3 pb-2 sm:scroll-px-0 sm:gap-4 sm:px-0"
          data-snips-scroller
        >
          {shorts.map((s) => (
            <ShortCard key={s.id} video={s} className="w-[132px] shrink-0 snap-start sm:w-[168px]" />
          ))}
        </div>

        {scrollState.left && (
          <button
            type="button"
            aria-label="Scroll Snips left"
            aria-controls="snips-shelf-scroller"
            onClick={() => scroll(-1)}
            className="absolute left-1 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-divider bg-surface/95 text-[25px] font-medium leading-none text-text shadow-md backdrop-blur-sm transition hover:bg-hover active:scale-95"
            data-snips-scroll-left
          >
            <span aria-hidden="true">&lt;</span>
          </button>
        )}

        {scrollState.right && (
          <button
            type="button"
            aria-label="Scroll Snips right"
            aria-controls="snips-shelf-scroller"
            onClick={() => scroll(1)}
            className="absolute right-1 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-divider bg-surface/95 text-[25px] font-medium leading-none text-text shadow-md backdrop-blur-sm transition hover:bg-hover active:scale-95"
            data-snips-scroll-right
          >
            <span aria-hidden="true">&gt;</span>
          </button>
        )}
      </div>
    </section>
  );
}

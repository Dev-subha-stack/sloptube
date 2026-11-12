"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VideoCard } from "@/components/VideoCard";
import type { RatedCard } from "@/lib/ratings/server";
import { StarsShown } from "./StarRating";

/** A grid of rated videos with their stars under each card. */
export function RatedGrid({ items, mine = false }: { items: RatedCard[]; mine?: boolean }) {
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), []);
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-rated-grid={items.length}>
      {items.map((r, i) => (
        <div key={r.card.id} className="min-w-0">
          <VideoCard video={r.card} now={now || Date.now()} eager={i < 4} />
          <p className="mt-1 flex items-center gap-2 px-3 text-[12px] text-text-2 sm:px-0">
            {mine && r.stars !== null ? (
              <>
                <StarsShown value={r.stars} /> You rated {r.stars}/5
              </>
            ) : (
              <>
                <StarsShown value={r.average} /> {r.average.toFixed(1)} · {r.ratings} rating{r.ratings === 1 ? "" : "s"}
              </>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}

export function RatedEmpty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <p className="text-[18px] text-text">{title}</p>
      <p className="mt-2 max-w-[420px] text-[14px] text-text-2">{hint}</p>
      <Link href="/" className="btn-blue mt-6">
        Browse videos
      </Link>
    </div>
  );
}

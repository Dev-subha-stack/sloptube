"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/store/session";

type Rating = { my: number | null; average: number; ratings: number };

function Star({ filled, half, className }: { filled: boolean; half?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <defs>
        <linearGradient id="half-star">
          <stop offset="50%" stopColor="currentColor" />
          <stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        fill={filled ? "currentColor" : half ? "url(#half-star)" : "none"}
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </svg>
  );
}

/** Read-only stars with the average, for cards and lists. */
export function StarsShown({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center text-[#f5b301]" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={value >= n - 0.25} half={value >= n - 0.75 && value < n - 0.25} className="shrink-0" />
      )).map((el, i) => (
        <span key={i} style={{ width: size, height: size }} className="inline-flex [&>svg]:h-full [&>svg]:w-full">
          {el}
        </span>
      ))}
    </span>
  );
}

/**
 * Five stars under the video: the viewer's own rating (click a star to rate,
 * click it again to clear) and the average from everyone.
 */
export function StarRating({ videoId }: { videoId: string }) {
  const router = useRouter();
  const signedIn = useSession((s) => s.user !== null);
  const [rating, setRating] = useState<Rating | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    void supabase.rpc("video_rating", { video_id: videoId }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : null;
      if (live && row) setRating({ my: row.my_stars ?? null, average: Number(row.average) || 0, ratings: row.ratings ?? 0 });
    });
    return () => {
      live = false;
    };
  }, [videoId, signedIn]);

  async function rate(stars: number) {
    if (!signedIn) {
      const here = window.location.pathname + window.location.search;
      router.push(`/login?next=${encodeURIComponent(here)}`);
      return;
    }
    if (busy) return;
    const next = rating?.my === stars ? null : stars;
    setBusy(true);
    setPop(stars);
    const { data, error } = await supabase.rpc("rate_video", { video_id: videoId, stars: next as number });
    setBusy(false);
    const row = Array.isArray(data) ? data[0] : null;
    if (!error && row) setRating({ my: row.my_stars ?? null, average: Number(row.average) || 0, ratings: row.ratings ?? 0 });
  }

  const shown = hover ?? rating?.my ?? 0;
  return (
    <div className="flex items-center gap-2 py-1" data-star-rating={rating?.my ?? "none"}>
      <div className="flex items-center" role="radiogroup" aria-label="Rate this video" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating?.my === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            title={rating?.my === n ? "Clear your rating" : `Rate ${n} out of 5`}
            disabled={busy}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(null)}
            onClick={() => void rate(n)}
            className={`grid h-8 w-7 place-items-center transition-transform hover:scale-110 ${n <= shown ? "text-[#f5b301]" : "text-icon"}`}
          >
            <span className={`inline-flex ${pop === n ? "anim-pop" : ""}`} onAnimationEnd={() => setPop(null)}>
              <Star filled={n <= shown} className="h-5 w-5" />
            </span>
          </button>
        ))}
      </div>
      <span className="text-[13px] text-text-2" data-rating-average>
        {rating && rating.ratings > 0
          ? `${rating.average.toFixed(1)} (${rating.ratings} rating${rating.ratings === 1 ? "" : "s"})`
          : "No ratings yet"}
      </span>
    </div>
  );
}

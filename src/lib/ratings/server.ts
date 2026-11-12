import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rowToCard, type FeedCard, type FeedRow } from "@/lib/feed/types";
import { readPublicBase } from "@/lib/watch/media";

export type RatedCard = { card: FeedCard; average: number; ratings: number; stars: number | null; ratedAt: string | null };

type RatedRow = FeedRow & { average?: number | string | null; ratings?: number | null; stars?: number | null; rated_at?: string | null };

function toRated(rows: unknown): RatedCard[] {
  const base = readPublicBase(process.env.MEDIA_PUBLIC_URL);
  return ((Array.isArray(rows) ? rows : []) as RatedRow[]).map((r) => ({
    card: rowToCard(r, base),
    average: Number(r.average ?? 0) || 0,
    ratings: Number(r.ratings ?? 0) || 0,
    stars: r.stars ?? null,
    ratedAt: r.rated_at ?? null,
  }));
}

/** The best rated public videos (more ratings count for more). */
export async function topRated(): Promise<RatedCard[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.rpc("top_rated_videos", { lim: 48 });
  return toRated(data);
}

/** The videos the signed in person rated, newest first; null when signed out. */
export async function myRatings(): Promise<RatedCard[] | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.rpc("my_ratings", { lim: 100 });
  return toRated(data);
}

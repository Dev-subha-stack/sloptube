"use client";

import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { rowToCard, type FeedCard, type FeedRow } from "@/lib/feed/types";

type State = {
  cards: FeedCard[] | null;
  ids: Set<string>;
  load: () => Promise<void>;
  /** Adds or removes; answers whether the video is now saved, or null when it failed. */
  toggle: (videoId: string) => Promise<boolean | null>;
  remove: (videoId: string) => Promise<void>;
  clear: () => Promise<void>;
};

async function myId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Watch later, saved in the signed-in person's account. */
export const useWatchLater = create<State>((set, get) => ({
  cards: null,
  ids: new Set(),
  load: async () => {
    const { data } = await supabase.rpc("watch_later_cards");
    const cards = ((data ?? []) as FeedRow[]).map((r) => rowToCard(r, null));
    set({ cards, ids: new Set(cards.map((c) => c.id)) });
  },
  toggle: async (videoId) => {
    const me = await myId();
    if (!me) return null;
    const saved = get().ids.has(videoId);
    const { error } = saved
      ? await supabase.from("watch_later").delete().eq("user_id", me).eq("video_id", videoId)
      : await supabase.from("watch_later").insert({ user_id: me, video_id: videoId });
    if (error && error.code !== "23505") return null;
    await get().load();
    return !saved;
  },
  remove: async (videoId) => {
    const me = await myId();
    if (!me) return;
    await supabase.from("watch_later").delete().eq("user_id", me).eq("video_id", videoId);
    await get().load();
  },
  clear: async () => {
    const me = await myId();
    if (!me) return;
    await supabase.from("watch_later").delete().eq("user_id", me);
    set({ cards: [], ids: new Set() });
  },
}));

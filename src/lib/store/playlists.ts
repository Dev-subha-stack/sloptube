"use client";

import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { cardMedia, rowToCard, type FeedCard, type FeedRow } from "@/lib/feed/types";

export type PlaylistVisibility = "public" | "unlisted" | "private";

/** One of the signed-in person's playlists, with its count and cover. */
export type PlaylistSummary = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  visibility: PlaylistVisibility;
  updatedAt: string;
  videoCount: number;
  firstVideoId: string | null;
  cover: string | null;
};

type Row = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  visibility: string;
  updated_at: string;
  video_count: number | null;
  first_video_id: string | null;
  first_thumbnail_url: string | null;
  first_hls_key: string | null;
};

export function rowToSummary(r: Row): PlaylistSummary {
  const cover = r.first_video_id
    ? cardMedia({ id: r.first_video_id, thumbnailUrl: r.first_thumbnail_url, hlsKey: r.first_hls_key, spriteKey: null }, null).thumbnail
    : null;
  return {
    id: r.id,
    ownerId: r.owner_id,
    title: r.title,
    description: r.description,
    visibility: (r.visibility as PlaylistVisibility) ?? "private",
    updatedAt: r.updated_at,
    videoCount: Number(r.video_count) || 0,
    firstVideoId: r.first_video_id,
    cover,
  };
}

/** Public playlists of one account, for its channel's Playlists tab. */
export async function publicPlaylistsOf(ownerId: string): Promise<PlaylistSummary[]> {
  const { data } = await supabase.rpc("playlist_summaries", { for_owner: ownerId, only_public: true });
  return ((data ?? []) as Row[]).map(rowToSummary);
}

type State = {
  mine: PlaylistSummary[] | null;
  loadMine: () => Promise<void>;
  /** Which of my playlists hold this video. */
  containing: (videoId: string) => Promise<Set<string>>;
  create: (title: string, visibility: PlaylistVisibility, videoId?: string) => Promise<PlaylistSummary | null>;
  addVideo: (playlistId: string, videoId: string) => Promise<boolean>;
  removeVideo: (playlistId: string, videoId: string) => Promise<boolean>;
  reorder: (playlistId: string, videoIds: string[]) => Promise<boolean>;
  update: (playlistId: string, patch: { title?: string; description?: string; visibility?: PlaylistVisibility }) => Promise<boolean>;
  remove: (playlistId: string) => Promise<boolean>;
};

async function myId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** The signed-in person's playlists, saved in their account. */
export const usePlaylists = create<State>((set, get) => ({
  mine: null,
  loadMine: async () => {
    const { data, error } = await supabase.rpc("playlist_summaries", {});
    if (!error) set({ mine: ((data ?? []) as Row[]).map(rowToSummary) });
    else set({ mine: [] });
  },
  containing: async (videoId) => {
    const ids = (get().mine ?? []).map((p) => p.id);
    if (ids.length === 0) return new Set();
    const { data } = await supabase.from("playlist_videos").select("playlist_id").eq("video_id", videoId).in("playlist_id", ids);
    return new Set(((data ?? []) as { playlist_id: string }[]).map((r) => r.playlist_id));
  },
  create: async (title, visibility, videoId) => {
    const owner = await myId();
    if (!owner || !title.trim()) return null;
    const { data, error } = await supabase
      .from("playlists")
      .insert({ owner_id: owner, title: title.trim().slice(0, 150), visibility })
      .select("id")
      .single();
    if (error || !data) return null;
    if (videoId) await get().addVideo((data as { id: string }).id, videoId);
    await get().loadMine();
    return get().mine?.find((p) => p.id === (data as { id: string }).id) ?? null;
  },
  addVideo: async (playlistId, videoId) => {
    const count = get().mine?.find((p) => p.id === playlistId)?.videoCount ?? 0;
    const { error } = await supabase.from("playlist_videos").insert({ playlist_id: playlistId, video_id: videoId, position: count });
    if (error && error.code !== "23505") return false;
    await supabase.from("playlists").update({ updated_at: new Date().toISOString() }).eq("id", playlistId);
    void get().loadMine();
    return true;
  },
  removeVideo: async (playlistId, videoId) => {
    const { error } = await supabase.from("playlist_videos").delete().eq("playlist_id", playlistId).eq("video_id", videoId);
    void get().loadMine();
    return !error;
  },
  reorder: async (playlistId, videoIds) => {
    const results = await Promise.all(
      videoIds.map((id, i) => supabase.from("playlist_videos").update({ position: i }).eq("playlist_id", playlistId).eq("video_id", id)),
    );
    void get().loadMine();
    return results.every((r) => !r.error);
  },
  update: async (playlistId, patch) => {
    const { error } = await supabase.from("playlists").update(patch).eq("id", playlistId);
    void get().loadMine();
    return !error;
  },
  remove: async (playlistId) => {
    const { error } = await supabase.from("playlists").delete().eq("id", playlistId);
    void get().loadMine();
    return !error;
  },
}));

/** The videos in a playlist the caller may watch, in order. */
export async function playlistCards(playlistId: string): Promise<FeedCard[]> {
  const { data } = await supabase.rpc("playlist_cards", { pid: playlistId });
  return ((data ?? []) as FeedRow[]).map((r) => rowToCard(r, null));
}

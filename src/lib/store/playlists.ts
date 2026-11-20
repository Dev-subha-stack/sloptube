"use client";

import { create } from "zustand";

const STORAGE_KEY = "sloptube_playlists";

export type Playlist = {
  id: string;
  title: string;
  description: string;
  channelId: string;
  visibility: "public" | "unlisted" | "private";
  createdAt: string;
  updatedAt: string;
  videoIds: string[];
};

type PlaylistsState = {
  playlists: Playlist[];
  loaded: boolean;
  load: () => void;
  createPlaylist: (title: string, description?: string, initialVideoId?: string) => Playlist;
  updatePlaylist: (id: string, patch: Partial<Omit<Playlist, "id" | "createdAt">>) => void;
  deletePlaylist: (id: string) => void;
  addVideo: (playlistId: string, videoId: string) => void;
  removeVideo: (playlistId: string, videoId: string) => void;
  reorderVideos: (playlistId: string, sourceIndex: number, destinationIndex: number) => void;
  hasVideo: (playlistId: string, videoId: string) => boolean;
};

// These IDs were bundled demo playlists from the early preview build.
// Remove only those fixtures; preserve playlists people created themselves.
const LEGACY_DEMO_PLAYLIST_IDS = new Set(["pl-open-animation", "pl-tech-engineering"]);

function persist(playlists: Playlist[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  } catch {}
}

export const usePlaylists = create<PlaylistsState>((set, get) => ({
  playlists: [],
  loaded: false,

  load: () => {
    if (typeof window === "undefined") return;
    let parsed: unknown = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) parsed = JSON.parse(stored);
    } catch {
      parsed = [];
    }
    const existing = Array.isArray(parsed) ? parsed : [];
    const playlists = existing.filter(
      (item): item is Playlist =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as Playlist).id === "string" &&
        !LEGACY_DEMO_PLAYLIST_IDS.has((item as Playlist).id),
    );
    set({ playlists, loaded: true });
    // Persist the cleaned list so preview fixtures do not return on next load.
    if (playlists.length !== existing.length || !Array.isArray(parsed)) persist(playlists);
    if (existing.length === 0 && !localStorage.getItem(STORAGE_KEY)) persist([]);
  },

  createPlaylist: (title, description = "", initialVideoId) => {
    const id = "pl-" + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    const newPl: Playlist = {
      id,
      title: title.trim() || "Untitled Playlist",
      description,
      channelId: "c-apex-001",
      visibility: "public",
      createdAt: now,
      updatedAt: now,
      videoIds: initialVideoId ? [initialVideoId] : [],
    };
    const next = [newPl, ...get().playlists];
    set({ playlists: next });
    persist(next);
    return newPl;
  },

  updatePlaylist: (id, patch) => {
    const next = get().playlists.map((pl) =>
      pl.id === id ? { ...pl, ...patch, updatedAt: new Date().toISOString() } : pl
    );
    set({ playlists: next });
    persist(next);
  },

  deletePlaylist: (id) => {
    const next = get().playlists.filter((pl) => pl.id !== id);
    set({ playlists: next });
    persist(next);
  },

  addVideo: (playlistId, videoId) => {
    const next = get().playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      if (pl.videoIds.includes(videoId)) return pl;
      return {
        ...pl,
        videoIds: [...pl.videoIds, videoId],
        updatedAt: new Date().toISOString(),
      };
    });
    set({ playlists: next });
    persist(next);
  },

  removeVideo: (playlistId, videoId) => {
    const next = get().playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      return {
        ...pl,
        videoIds: pl.videoIds.filter((id) => id !== videoId),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ playlists: next });
    persist(next);
  },

  reorderVideos: (playlistId, sourceIndex, destinationIndex) => {
    const pl = get().playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    const items = [...pl.videoIds];
    const [moved] = items.splice(sourceIndex, 1);
    items.splice(destinationIndex, 0, moved);

    const next = get().playlists.map((p) =>
      p.id === playlistId ? { ...p, videoIds: items, updatedAt: new Date().toISOString() } : p
    );
    set({ playlists: next });
    persist(next);
  },

  hasVideo: (playlistId, videoId) => {
    const pl = get().playlists.find((p) => p.id === playlistId);
    return Boolean(pl?.videoIds.includes(videoId));
  },
}));

"use client";

import { create } from "zustand";
import { CLIENT_VIDEOS, type ClientVideo } from "@/lib/clientData";

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

const SEED_PLAYLISTS: Playlist[] = [
  {
    id: "pl-open-animation",
    title: "Open Source Animation Masterpieces",
    description: "Curated collection of groundbreaking open CGI films and animations.",
    channelId: "c-opencinema-003",
    visibility: "public",
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    videoIds: ["v-open-001", "v-open-002", "v-cosmos-001"],
  },
  {
    id: "pl-tech-engineering",
    title: "Full-Stack System Architecture & Web Performance",
    description: "Deep dive tutorials on frontend performance, modern frameworks, and distributed designs.",
    channelId: "c-codecraft-004",
    visibility: "public",
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    videoIds: ["v-code-001", "v-apex-001", "v-apex-002"],
  },
];

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
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Playlist[];
        set({ playlists: parsed, loaded: true });
        return;
      }
    } catch {}
    set({ playlists: SEED_PLAYLISTS, loaded: true });
    persist(SEED_PLAYLISTS);
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

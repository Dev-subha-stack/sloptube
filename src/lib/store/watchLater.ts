"use client";

import { create } from "zustand";
import { CLIENT_VIDEOS, type ClientVideo } from "@/lib/clientData";

const STORAGE_KEY = "sloptube_watch_later";

type WatchLaterItem = {
  video: ClientVideo;
  addedAt: string;
};

type WatchLaterState = {
  items: WatchLaterItem[];
  loaded: boolean;
  add: (video: ClientVideo) => void;
  remove: (videoId: string) => void;
  toggle: (video: ClientVideo) => boolean;
  has: (videoId: string) => boolean;
  clear: () => void;
  load: () => void;
};

export const useWatchLater = create<WatchLaterState>((set, get) => ({
  items: [],
  loaded: false,

  load: () => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as WatchLaterItem[];
        set({ items: parsed, loaded: true });
        return;
      }
    } catch {}
    const initial: WatchLaterItem[] = [
      { video: CLIENT_VIDEOS[0], addedAt: new Date(Date.now() - 3600000).toISOString() },
      { video: CLIENT_VIDEOS[2], addedAt: new Date(Date.now() - 7200000).toISOString() },
    ];
    set({ items: initial, loaded: true });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch {}
  },

  add: (video) => {
    const { items } = get();
    if (items.some((i) => i.video.id === video.id)) return;
    const next = [{ video, addedAt: new Date().toISOString() }, ...items];
    set({ items: next });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  },

  remove: (videoId) => {
    const { items } = get();
    const next = items.filter((i) => i.video.id !== videoId);
    set({ items: next });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  },

  toggle: (video) => {
    const { has, add, remove } = get();
    if (has(video.id)) {
      remove(video.id);
      return false;
    } else {
      add(video);
      return true;
    }
  },

  has: (videoId) => {
    return get().items.some((i) => i.video.id === videoId);
  },

  clear: () => {
    set({ items: [] });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  },
}));

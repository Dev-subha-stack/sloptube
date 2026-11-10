import { create } from "zustand";

export type NotificationType = "comment" | "reply" | "like" | "subscribe";

export type Notification = {
  id: string;
  type: NotificationType;
  message: string;
  videoId?: string;
  read: boolean;
  createdAt: number;
};

type NotificationState = {
  notifications: Notification[];
  loaded: boolean;
  load: () => void;
  unreadCount: () => number;
  addNotification: (n: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
};

const STORAGE_KEY = "sloptube-notifications";

const SEED: Notification[] = [
  {
    id: "notif-seed-1",
    type: "comment",
    message: "Alex commented on your video: \"Great content!\"",
    videoId: "v-bbb-001",
    read: false,
    createdAt: Date.now() - 3600_000,
  },
  {
    id: "notif-seed-2",
    type: "subscribe",
    message: "Sarah subscribed to your channel",
    read: false,
    createdAt: Date.now() - 7200_000,
  },
  {
    id: "notif-seed-3",
    type: "like",
    message: "Your video received 10 new likes",
    videoId: "v-bbb-002",
    read: true,
    createdAt: Date.now() - 86400_000,
  },
];

function readStorage(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Notification[]) : SEED;
  } catch {
    return SEED;
  }
}

function writeStorage(notifications: Notification[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // Storage full or unavailable.
  }
}

export const useNotifications = create<NotificationState>((set, get) => ({
  notifications: [],
  loaded: false,
  load: () => {
    if (get().loaded) return;
    const items = readStorage();
    set({ notifications: items, loaded: true });
  },
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
  addNotification: (n) => {
    const notification: Notification = {
      ...n,
      id: crypto.randomUUID(),
      read: false,
      createdAt: Date.now(),
    };
    const next = [notification, ...get().notifications].slice(0, 50);
    writeStorage(next);
    set({ notifications: next });
  },
  markRead: (id) => {
    const next = get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    writeStorage(next);
    set({ notifications: next });
  },
  markAllRead: () => {
    const next = get().notifications.map((n) => ({ ...n, read: true }));
    writeStorage(next);
    set({ notifications: next });
  },
  clearAll: () => {
    writeStorage([]);
    set({ notifications: [] });
  },
}));

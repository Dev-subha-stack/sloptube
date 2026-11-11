"use client";

// Several signed in accounts in one browser, with one tap to switch. Each
// account's session (the same tokens the sign-in keeps in this browser) is
// saved here; switching hands the saved session back to the auth client.
// Nothing leaves the browser. Sessions are never signed out on the server
// when you add or switch, so every saved account stays signed in.

import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export const ACCOUNTS_KEY = "sloptube-accounts";
/** No more than this many saved accounts. */
export const MAX_ACCOUNTS = 5;

export type SavedAccount = {
  userId: string;
  email: string | null;
  name: string;
  username: string;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string;
  savedAt: number;
};

function read(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as SavedAccount[]).filter((a) => a && a.userId && a.refreshToken) : [];
  } catch {
    return [];
  }
}

function write(list: SavedAccount[]) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list.slice(0, MAX_ACCOUNTS)));
  } catch {
    // Storage full or blocked: switching just won't remember this one.
  }
}

/** Puts `a` in the list (replacing an older copy of the same account), newest first. */
export function upsertAccount(list: SavedAccount[], a: SavedAccount): SavedAccount[] {
  return [a, ...list.filter((x) => x.userId !== a.userId)].slice(0, MAX_ACCOUNTS);
}

type Profile = { name: string; username: string; avatarUrl: string | null };

type AccountsState = {
  accounts: SavedAccount[];
  switching: string | null;
  error: string | null;
  load: () => void;
  /** Saves the current session under this profile (called whenever the signed in person is known). */
  remember: (profile: Profile) => Promise<void>;
  switchTo: (userId: string) => Promise<void>;
  addAnother: (next?: string) => Promise<void>;
  forget: (userId: string) => void;
};

let listening = false;

export const useAccounts = create<AccountsState>((set, get) => ({
  accounts: [],
  switching: null,
  error: null,

  load() {
    set({ accounts: read() });
    if (listening || typeof window === "undefined") return;
    listening = true;
    // Keep the saved copy of the active account's tokens fresh as they rotate.
    supabase.auth.onAuthStateChange((event, session) => {
      if ((event !== "TOKEN_REFRESHED" && event !== "SIGNED_IN") || !session) return;
      const list = read();
      const i = list.findIndex((a) => a.userId === session.user.id);
      if (i < 0) return;
      list[i] = { ...list[i]!, accessToken: session.access_token, refreshToken: session.refresh_token, savedAt: Date.now() };
      write(list);
      set({ accounts: list });
    });
  },

  async remember(profile) {
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    if (!s) return;
    const list = upsertAccount(read(), {
      userId: s.user.id,
      email: s.user.email ?? null,
      name: profile.name,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
      accessToken: s.access_token,
      refreshToken: s.refresh_token,
      savedAt: Date.now(),
    });
    write(list);
    set({ accounts: list });
  },

  async switchTo(userId) {
    const target = read().find((a) => a.userId === userId);
    if (!target) return;
    set({ switching: userId, error: null });
    // Save the current account's latest tokens first.
    const { data: cur } = await supabase.auth.getSession();
    if (cur.session) {
      const list = read();
      const i = list.findIndex((a) => a.userId === cur.session!.user.id);
      if (i >= 0) {
        list[i] = { ...list[i]!, accessToken: cur.session.access_token, refreshToken: cur.session.refresh_token };
        write(list);
      }
    }
    const { error } = await supabase.auth.setSession({ access_token: target.accessToken, refresh_token: target.refreshToken });
    if (error) {
      // That sign-in ran out: drop it and ask to sign in again.
      write(read().filter((a) => a.userId !== userId));
      set({ switching: null, accounts: read(), error: "That account was signed out. Sign in to it again." });
      // Put the previous account back.
      if (cur.session) await supabase.auth.setSession({ access_token: cur.session.access_token, refresh_token: cur.session.refresh_token });
      return;
    }
    // A full reload so every page, cache and menu belongs to the new account.
    window.location.reload();
  },

  async addAnother(next) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const list = read();
      const i = list.findIndex((a) => a.userId === data.session!.user.id);
      if (i >= 0) {
        list[i] = { ...list[i]!, accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
        write(list);
      }
    }
    // Forget the session in this browser only (no server sign-out, the saved account stays valid).
    const key = (supabase.auth as unknown as { storageKey?: string }).storageKey;
    try {
      if (key) {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}-code-verifier`);
        localStorage.removeItem(`${key}-user`);
      }
    } catch {
      // ignore
    }
    window.location.assign(`/login?add=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  },

  forget(userId) {
    const list = read().filter((a) => a.userId !== userId);
    write(list);
    set({ accounts: list });
  },
}));

/** Your own staff roles (admin, moderator), read once per page. */
export async function myRoles(): Promise<string[]> {
  const { data: u } = await supabase.auth.getSession();
  if (!u.session) return [];
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.session.user.id);
  return (data ?? []).map((r) => String((r as { role: string }).role));
}

import { createContext, useContext } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { SupabaseConfig } from "@/lib/supabase/env";

/** What the browser knows about the signed in person. Never secrets. */
export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  /** False until username and birthdate are confirmed (complete_signup). */
  onboarded: boolean;
  /** The person's channel handle, or null before migration 004 is applied. */
  channelHandle: string | null;
};

type SessionState = {
  /** True once the server has handed its values over for this page load. */
  loaded: boolean;
  config: SupabaseConfig | null;
  user: SessionUser | null;
  /** Feature flags already evaluated for this person: key to on or off. */
  flags: Record<string, boolean>;
  setSession: (s: {
    config: SupabaseConfig | null;
    user: SessionUser | null;
    flags: Record<string, boolean>;
  }) => void;
};

export type SessionInit = { config: SupabaseConfig | null; user: SessionUser | null; flags: Record<string, boolean> };

function makeStore(init?: SessionInit): StoreApi<SessionState> {
  return createStore<SessionState>((set) => ({
    loaded: init !== undefined,
    config: init?.config ?? null,
    user: init?.user ?? null,
    flags: init?.flags ?? {},
    setSession: (s) => set({ ...s, loaded: true }),
  }));
}

/** The browser's one store (one visitor per tab). */
let browserStore: StoreApi<SessionState> | null = null;

/**
 * The store for this render: in the browser the shared one, seeded from the
 * root loader on first use; on the server a fresh one per request so nothing
 * is shared between visitors.
 */
export function sessionStoreFor(init: SessionInit): StoreApi<SessionState> {
  if (typeof window === "undefined") return makeStore(init);
  if (!browserStore) browserStore = makeStore(init);
  return browserStore;
}

function globalStore(): StoreApi<SessionState> {
  if (!browserStore) browserStore = makeStore();
  return browserStore;
}

export const SessionContext = createContext<StoreApi<SessionState> | null>(null);

function useSessionImpl<T>(selector: (s: SessionState) => T): T {
  const store = useContext(SessionContext) ?? globalStore();
  return useStore(store, selector);
}

export const useSession = Object.assign(useSessionImpl, {
  getState: () => globalStore().getState(),
});

/** Client side flag check. Use flagOn() from lib/flags.ts on the server. */
export function useFlag(key: string): boolean {
  return useSession((s) => s.flags[key] === true);
}

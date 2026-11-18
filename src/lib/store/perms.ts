"use client";

import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

type PermsState = {
  /** null until loaded. Always read from the database, never kept in the browser. */
  perms: Set<string> | null;
  isAdmin: boolean;
  forUser: string | null;
  load: (userId: string | null) => void;
};

/** The signed-in person's staff powers, for showing the right admin tabs and buttons. The database still checks every action. */
export const usePerms = create<PermsState>((set, get) => ({
  perms: null,
  isAdmin: false,
  forUser: null,
  load: (userId) => {
    if (get().forUser === userId && get().perms) return;
    set({ forUser: userId, perms: userId ? null : new Set(), isAdmin: false });
    if (!userId) return;
    void Promise.all([supabase.rpc("my_permissions"), supabase.rpc("has_role", { _user_id: userId, _role: "admin" })]).then(([p, a]) => {
      if (get().forUser !== userId) return;
      set({ perms: new Set(((p.data ?? []) as string[]).map(String)), isAdmin: a.data === true });
    });
  },
}));

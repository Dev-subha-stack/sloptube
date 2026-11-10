"use client";

import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type StaffBadgeKind = "owner" | "admin" | "moderator";

type StaffState = {
  loaded: boolean;
  /** Channel handles and usernames (lower case) of staff, with their badge. */
  byName: Record<string, StaffBadgeKind>;
  load: () => void;
};

let loading = false;

/** Who gets a badge next to their name: loaded once per page visit (it is public). */
export const useStaff = create<StaffState>((set) => ({
  loaded: false,
  byName: {},
  load: () => {
    if (loading || typeof window === "undefined") return;
    loading = true;
    void supabase.rpc("staff_badges").then(({ data }) => {
      const byName: Record<string, StaffBadgeKind> = {};
      for (const row of (data ?? []) as { username: string | null; channel_handle: string | null; badge: string }[]) {
        const badge = (row.badge === "owner" || row.badge === "admin" ? row.badge : "moderator") as StaffBadgeKind;
        if (row.username) byName[row.username.toLowerCase()] = badge;
        if (row.channel_handle) byName[row.channel_handle.toLowerCase()] = badge;
      }
      set({ loaded: true, byName });
    });
  },
}));

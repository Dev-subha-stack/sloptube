"use client";

import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type StaffBadgeKind = "owner" | "admin" | "moderator";
export type CustomBadgeInfo = { name: string; color: string };

type StaffState = {
  loaded: boolean;
  /** Channel handles and usernames (lower case) of staff, with their badge. */
  byName: Record<string, StaffBadgeKind>;
  /** Badges from custom roles (lower-case handle or username), in the order admins set. */
  customByName: Record<string, CustomBadgeInfo[]>;
  load: () => void;
  /** Fetch again, after an admin changes roles. */
  reload: () => void;
};

let loading = false;

function add(map: Record<string, CustomBadgeInfo[]>, key: string | null, badge: CustomBadgeInfo) {
  if (!key) return;
  const k = key.toLowerCase();
  const list = (map[k] ??= []);
  if (!list.some((b) => b.name === badge.name)) list.push(badge);
}

/** Who gets a badge next to their name: loaded once per page visit (it is public). */
export const useStaff = create<StaffState>((set) => ({
  loaded: false,
  byName: {},
  customByName: {},
  load: () => {
    if (loading || typeof window === "undefined") return;
    loading = true;
    void Promise.all([supabase.rpc("staff_badges"), supabase.rpc("custom_badges")]).then(([staff, custom]) => {
      const byName: Record<string, StaffBadgeKind> = {};
      for (const row of (staff.data ?? []) as { username: string | null; channel_handle: string | null; badge: string }[]) {
        const badge = (row.badge === "owner" || row.badge === "admin" ? row.badge : "moderator") as StaffBadgeKind;
        if (row.username) byName[row.username.toLowerCase()] = badge;
        if (row.channel_handle) byName[row.channel_handle.toLowerCase()] = badge;
      }
      const customByName: Record<string, CustomBadgeInfo[]> = {};
      for (const row of (custom.data ?? []) as { username: string | null; channel_handle: string | null; badge_name: string; badge_color: string }[]) {
        const badge = { name: row.badge_name, color: row.badge_color };
        add(customByName, row.username, badge);
        add(customByName, row.channel_handle, badge);
      }
      set({ loaded: true, byName, customByName });
    });
  },
  reload: () => {
    loading = false;
    useStaff.getState().load();
  },
}));

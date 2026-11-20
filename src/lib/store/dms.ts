"use client";

import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

/** Unread direct messages for the top bar badge. Always counted by the database. */
export const useDmUnread = create<{ count: number; refresh: () => Promise<void> }>((set) => ({
  count: 0,
  refresh: async () => {
    const { data, error } = await supabase.rpc("dm_unread_count");
    if (!error) set({ count: Number(data) || 0 });
  },
}));

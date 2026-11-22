"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ChatIcon } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { useDmUnread } from "@/lib/store/dms";

/** Chat bubble in the top bar with the number of unread messages; updates live. */
export function MessagesButton({ userId }: { userId: string }) {
  const count = useDmUnread((s) => s.count);
  const refresh = useDmUnread((s) => s.refresh);
  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel(`dm-badge-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${userId}` }, () => void refresh())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);
  const label = count > 0 ? `Messages, ${count} unread` : "Messages";
  return (
    <Link href="/messages" aria-label={label} title="Messages" className="press relative grid h-8 w-8 place-items-center rounded-full text-icon hover:bg-hover sm:h-10 sm:w-10" data-dm-button>
      <ChatIcon className="h-6 w-6" />
      {count > 0 && (
        <span className="anim-pop absolute right-0.5 top-0.5 min-w-4 rounded-full bg-red px-1 text-center text-[11px] font-medium leading-4 text-white" data-dm-badge={count}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

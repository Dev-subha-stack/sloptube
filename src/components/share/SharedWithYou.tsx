"use client";

import { useEffect, useState } from "react";
import { VideoCard } from "@/components/VideoCard";
import { supabase } from "@/integrations/supabase/client";
import { rowToCard, type FeedCard, type FeedRow } from "@/lib/feed/types";
import { useSession } from "@/lib/store/session";

/** Library: private videos other people shared with you. Hidden when there are none. */
export function SharedWithYou({ onCount }: { onCount?: (n: number) => void }) {
  const user = useSession((s) => s.user);
  const [cards, setCards] = useState<FeedCard[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let live = true;
    void supabase.rpc("shared_with_me", { lim: 50 }).then(({ data }) => {
      if (!live) return;
      const found = ((data ?? []) as FeedRow[]).map((r) => rowToCard(r, null));
      setCards(found);
      onCount?.(found.length);
    });
    return () => {
      live = false;
    };
  }, [user, onCount]);

  if (!user || !cards || cards.length === 0) return null;
  const now = Date.now();
  return (
    <section className="px-4 py-6 sm:px-6" data-shared-with-you>
      <h2 className="mb-4 text-[20px] font-medium leading-7 text-text">Shared with you</h2>
      <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <VideoCard key={c.id} video={c} now={now} />
        ))}
      </div>
    </section>
  );
}

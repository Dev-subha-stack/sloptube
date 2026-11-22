"use client";

import Link from "next/link";
import { useEffect } from "react";
import { VideoRow } from "@/components/playlist/VideoRow";
import { ClockIcon, DeleteIcon } from "@/components/icons";
import { useSession } from "@/lib/store/session";
import { useSubscriptions } from "@/lib/store/subscriptions";
import { useWatchLater } from "@/lib/store/watchLater";

/** /feed/watch-later: the videos saved for later, newest first. */
export function WatchLaterView() {
  const user = useSession((s) => s.user);
  const loaded = useSession((s) => s.loaded);
  const { cards, load, remove, clear } = useWatchLater();
  const showToast = useSubscriptions((s) => s.showToast);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (loaded && !user) {
    return (
      <div className="flex flex-col items-center px-6 py-20 text-center">
        <ClockIcon className="h-16 w-16 text-text-3" />
        <p className="mt-4 text-[18px] text-text">Save videos to watch later</p>
        <Link href="/login?next=%2Ffeed%2Fwatch-later" className="btn-blue mt-6">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-3 py-6 sm:px-6" data-watch-later={cards ? cards.length : "loading"}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-divider pb-4">
        <div className="flex items-center gap-3">
          <ClockIcon className="h-7 w-7 text-[var(--mark)]" />
          <h1 className="text-[22px] leading-8 text-text">Watch later</h1>
          <span className="text-[14px] text-text-2">{cards ? `${cards.length} videos` : ""}</span>
        </div>
        {cards && cards.length > 0 && (
          <button type="button" onClick={() => void clear()} className="btn-text">
            Clear all
          </button>
        )}
      </div>
      {cards === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[94px] rounded-[8px] bg-skeleton" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-[16px] text-text">Nothing saved yet</p>
          <p className="mt-1 max-w-[360px] text-[14px] text-text-2">Press Save under any video and tick Watch later.</p>
          <Link href="/" className="btn-blue mt-6">
            Explore videos
          </Link>
        </div>
      ) : (
        <div>
          {cards.map((v, i) => (
            <VideoRow
              key={v.id}
              video={v}
              index={i}
              href={`/watch?v=${v.id}`}
              actions={
                <button
                  type="button"
                  onClick={() => {
                    void remove(v.id);
                    showToast(`Removed "${v.title}" from Watch later`);
                  }}
                  aria-label={`Remove ${v.title} from Watch later`}
                  className="press grid h-9 w-9 shrink-0 place-items-center rounded-full text-icon hover:bg-[var(--active)] hover:text-[var(--error)]"
                >
                  <DeleteIcon className="h-5 w-5" />
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ClockIcon, DeleteIcon } from "@/components/icons";
import { Thumb } from "@/components/Thumb";
import { formatTime, timeAgo } from "@/lib/watch/format";
import { useWatchLater } from "@/lib/store/watchLater";
import { useSubscriptions } from "@/lib/store/subscriptions";

export function WatchLaterView() {
  const { items, loaded, load, remove, clear } = useWatchLater();
  const showToast = useSubscriptions((s) => s.showToast);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="h-8 w-48 bg-skeleton rounded-xs animate-pulse mb-6" />
        <div className="space-y-4">
          <div className="h-28 bg-skeleton rounded-xs animate-pulse" />
          <div className="h-28 bg-skeleton rounded-xs animate-pulse" />
        </div>
      </div>
    );
  }

  const handleRemove = (videoId: string, title: string) => {
    remove(videoId);
    showToast(`Removed "${title}" from Watch Later`);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-divider pb-4 mb-6">
        <div className="flex items-center gap-3">
          <ClockIcon className="h-7 w-7 text-[var(--mark)]" />
          <h1 className="text-[24px] font-normal leading-8 text-text">Watch Later</h1>
          <span className="text-[14px] text-text-2">({items.length} videos)</span>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-[13px] font-medium uppercase text-text-2 hover:text-[var(--error)] transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClockIcon className="h-16 w-16 text-text-3 mb-4" />
          <p className="text-[18px] text-text font-medium">No videos saved to Watch Later</p>
          <p className="mt-1 text-[14px] text-text-2 max-w-[360px]">
            Hover over any video thumbnail and click the clock icon to save videos for later.
          </p>
          <Link href="/" className="btn-blue mt-6">
            Explore videos
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-divider/60">
          {items.map(({ video, addedAt }, idx) => {
            const href = `/watch?v=${video.id}`;
            return (
              <div
                key={video.id}
                className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-3 hover:bg-hover/60 px-3 rounded-xs transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <span className="text-[13px] text-text-3 w-5 text-center shrink-0 hidden sm:inline">
                    {idx + 1}
                  </span>
                  <Link href={href} className="relative aspect-video w-[160px] sm:w-[180px] shrink-0 bg-skeleton overflow-hidden rounded-xs">
                    <Thumb src={video.thumbnail} alt={video.title} />
                    {video.durationS && (
                      <span className="absolute bottom-1 right-1 rounded-xs bg-black/80 px-1 py-[2px] text-[11px] font-medium text-white">
                        {formatTime(video.durationS)}
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={href} className="text-[14px] font-medium text-text line-clamp-2 hover:underline">
                      {video.title}
                    </Link>
                    <p className="mt-1 text-[12px] text-text-2">Added {timeAgo(addedAt, Date.now())}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleRemove(video.id, video.title)}
                    title="Remove from Watch Later"
                    aria-label="Remove from Watch Later"
                    className="grid h-9 w-9 place-items-center rounded-full text-icon hover:bg-hover hover:text-[var(--error)] transition-colors"
                  >
                    <DeleteIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

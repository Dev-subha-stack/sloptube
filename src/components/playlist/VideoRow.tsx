import Link from "next/link";
import type { ReactNode } from "react";
import { Thumb } from "@/components/Thumb";
import { viewsLabel } from "@/lib/feed/format";
import type { FeedCard } from "@/lib/feed/types";
import { formatTime } from "@/lib/watch/format";

/** A video in a list (playlist, Watch later): number, thumbnail, title, channel, then actions. */
export function VideoRow({ video, index, href, actions, handle }: { video: FeedCard; index: number; href: string; actions?: ReactNode; handle?: ReactNode }) {
  return (
    <div className="group flex items-center gap-3 rounded-[8px] px-2 py-2 transition-colors hover:bg-hover" data-list-video={video.id}>
      {handle}
      <span className="hidden w-5 shrink-0 text-center text-[13px] text-text-3 sm:inline">{index + 1}</span>
      <Link href={href} className="card-thumb relative aspect-video w-[140px] shrink-0 overflow-hidden rounded-[8px] bg-skeleton sm:w-[168px]">
        <Thumb src={video.thumbnail} alt={video.title} sizes="168px" />
        {video.durationS !== null && (
          <span className="absolute bottom-1 right-1 rounded-[4px] bg-black/80 px-1 py-[2px] text-[11px] font-medium text-white">{formatTime(video.durationS)}</span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={href} className="line-clamp-2 text-[14px] font-medium leading-5 text-text">
          {video.title}
        </Link>
        <p className="mt-1 truncate text-[12px] text-text-2">
          <Link href={`/@${video.channel.handle}`} className="hover:text-text">
            {video.channel.name}
          </Link>{" "}
          · {viewsLabel(video.views)}
        </p>
      </div>
      {actions}
    </div>
  );
}

import Link from "next/link";
import { StaffBadge } from "@/components/admin/RoleBadge";
import { Avatar } from "@/components/Avatar";
import { PlayIcon } from "@/components/icons";
import { Thumb } from "@/components/Thumb";
import { viewsLabel } from "@/lib/feed/format";
import type { FeedCard } from "@/lib/feed/types";
import { formatTime, timeAgo } from "@/lib/watch/format";

/** The most watched of the newest videos, shown big at the top of Home. */
export function pickFeatured(cards: FeedCard[]): FeedCard | null {
  const pool = cards.slice(0, 12).filter((c) => !c.isShort);
  if (pool.length === 0) return null;
  return pool.reduce((best, c) => (c.views > best.views ? c : best), pool[0]!);
}

export function FeaturedVideo({ video, now }: { video: FeedCard; now: number }) {
  const href = `/watch?v=${video.id}`;
  const channelHref = `/@${video.channel.handle}`;
  return (
    <section aria-label="Featured video" className="mb-8 px-3 sm:px-0" data-featured={video.id}>
      <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:gap-8">
        <Link href={href} className="card-thumb group relative block aspect-video overflow-hidden rounded-[16px] bg-[var(--hover)]">
          <Thumb src={video.thumbnail} alt={video.title} eager sizes="(min-width: 768px) 60vw, 100vw" />
          <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors duration-200 group-hover:bg-black/25">
            <span className="grid h-16 w-16 scale-90 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
              <PlayIcon className="h-9 w-9" />
            </span>
          </span>
          {video.durationS !== null && (
            <span className="absolute bottom-2 right-2 rounded-[4px] bg-black/80 px-1.5 py-[2px] text-[12px] font-medium text-white">{formatTime(video.durationS)}</span>
          )}
        </Link>
        <div className="min-w-0">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--mark)]">Featured</p>
          <h2 className="mt-2 line-clamp-3 text-[22px] font-bold leading-[1.25] text-text sm:text-[28px]">
            <Link href={href}>{video.title}</Link>
          </h2>
          <div className="mt-4 flex min-w-0 items-center gap-3">
            <Link href={channelHref} className="shrink-0" aria-label={video.channel.name}>
              <Avatar name={video.channel.name} url={video.channel.avatarUrl} size={40} />
            </Link>
            <div className="min-w-0">
              <Link href={channelHref} className="block truncate text-[14px] font-medium text-text">
                {video.channel.name}
                <StaffBadge name={video.channel.handle} />
              </Link>
              <p className="text-[13px] text-text-2">
                {viewsLabel(video.views)} · {timeAgo(video.publishedAt, now)}
              </p>
            </div>
          </div>
          <Link href={href} className="btn-blue press mt-5 inline-flex items-center gap-2 rounded-full px-5">
            <PlayIcon className="h-5 w-5" /> Watch now
          </Link>
        </div>
      </div>
    </section>
  );
}

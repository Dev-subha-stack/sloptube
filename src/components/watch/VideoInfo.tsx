"use client";

import { StaffBadge } from "@/components/admin/RoleBadge";
import { StarRating } from "@/components/ratings/StarRating";
import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { LinkedText } from "@/components/LinkedText";
import { Menu } from "@/components/Menu";
import { useReport } from "@/components/moderation/ReportMenuItem";
import { useFlag } from "@/lib/store/session";
import {
  DownloadIcon,
  LinkIcon,
  LockIcon,
  MoreHorizIcon,
  PlaylistAddIcon,
  ShareIcon,
} from "@/components/icons";
import type { WatchEngagement } from "@/lib/engagement/types";
import { formatDate, formatViews } from "@/lib/watch/format";
import type { WatchVideo } from "@/lib/watch/types";
import { SubscribeButton } from "@/components/subscriptions/SubscribeButton";
import { SubscriberCount } from "@/components/subscriptions/SubscriberCount";
import { LikeButtons } from "./LikeButtons";
import { ShareDialog } from "./ShareDialog";

function ActionButton({
  Icon,
  label,
  count,
  onClick,
  title,
  mirror = false,
  ...rest
}: {
  Icon: ComponentType<{ className?: string }>;
  label: string;
  count?: string;
  onClick?: () => void;
  title?: string;
  mirror?: boolean;
} & Record<`data-${string}`, unknown>) {
  const disabled = !onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
      className={`flex h-9 items-center gap-1.5 px-1.5 text-[13px] font-medium uppercase tracking-[0.007px] text-text-2 sm:px-2 ${
        disabled ? "cursor-not-allowed opacity-60" : "hover:text-text"
      }`}
      {...rest}
    >
      <Icon className={`h-6 w-6 text-icon ${mirror ? "-scale-x-100" : ""}`} />
      <span className={count === undefined ? "hidden sm:inline" : ""}>{count ?? label}</span>
    </button>
  );
}

function VisibilityNote({ visibility }: { visibility: WatchVideo["visibility"] }) {
  if (visibility === "public") return null;
  const Icon = visibility === "private" ? LockIcon : LinkIcon;
  return (
    <span className="mr-2 inline-flex items-center gap-1 align-middle text-[12px] font-medium uppercase text-text-2">
      <Icon className="h-4 w-4" />
      {visibility}
    </span>
  );
}

/** The description, folded to three lines with SHOW MORE, like 2019. */
function Description({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) setLong(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  if (!text) return <p className="text-[14px] leading-5 text-text-2">No description</p>;
  return (
    <div data-description={open ? "open" : "closed"}>
      <div
        ref={ref}
        className={`whitespace-pre-wrap break-words text-[14px] leading-5 text-text ${open ? "" : "line-clamp-3"}`}
      >
        <LinkedText text={text} />
      </div>
      {(long || open) && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="mt-2 text-[13px] font-medium uppercase tracking-[0.007px] text-text-2 hover:text-text"
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

/** Title, the views and date line with the action buttons, the channel row and the description. */
export function VideoInfo({
  video,
  engagement = null,
  children,
}: {
  video: WatchVideo;
  /** Likes for this viewer with the engagement flag on; null keeps the placeholders. */
  engagement?: WatchEngagement | null;
  children?: ReactNode;
}) {
  const [sharing, setSharing] = useState(false);
  const moderation = useFlag("moderation");
  const report = useReport("video", video.id);
  const channelHref = `/@${video.channel.handle}`;
  const [downloading, setDownloading] = useState(false);
  const [downloadNote, setDownloadNote] = useState<string | null>(null);
  const canDownload = Boolean(video.src && video.src.startsWith("/api/media/") && !/\.m3u8(\?|$)/i.test(video.src));

  async function download() {
    if (!video.src || downloading) return;
    setDownloading(true);
    setDownloadNote(null);
    try {
      const res = await fetch(`${video.src}?download=1`);
      const j = res.ok ? ((await res.json()) as { url?: string }) : null;
      if (!j?.url) throw new Error("no link");
      const a = document.createElement("a");
      a.href = j.url;
      a.rel = "noopener";
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDownloadNote("Download started");
    } catch {
      setDownloadNote("The download couldn't start. Try again.");
    } finally {
      setDownloading(false);
      setTimeout(() => setDownloadNote(null), 3000);
    }
  }

  return (
    <div className="px-3 pt-3 tab:px-0 tab:pt-5">
      <h1 data-watch-title className="text-[18px] font-normal leading-[26px] text-text">
        {video.title}
      </h1>

      <div className="flex flex-wrap items-center justify-between gap-y-1 border-b border-divider pb-2 pt-1">
        <p className="py-1 text-[14px] leading-5 text-text-2" data-watch-meta>
          <VisibilityNote visibility={video.visibility} />
          {formatViews(video.views)} · {formatDate(video.date)}
        </p>
        <StarRating videoId={video.id} />
        <div className="-mx-1.5 flex items-center sm:mx-0">
          <LikeButtons key={video.id} videoId={video.id} engagement={engagement} />
          <ActionButton Icon={ShareIcon} label="Share" onClick={() => setSharing(true)} mirror data-share />
          <ActionButton
            Icon={DownloadIcon}
            label={downloading ? "Preparing" : "Download"}
            title={canDownload ? "Download this video" : "This video can't be downloaded."}
            onClick={canDownload ? () => void download() : undefined}
            data-download
          />
          <ActionButton Icon={PlaylistAddIcon} label="Save" title="Saving to a playlist arrives in a later feature." />
          {moderation && !video.isOwner ? (
            <Menu
              label="More actions"
              width={180}
              button={<MoreHorizIcon className="h-6 w-6" />}
              buttonClassName="grid h-9 w-9 place-items-center rounded-full text-icon hover:bg-hover hover:text-text"
            >
              {(close) => report.item(close)}
            </Menu>
          ) : (
            <ActionButton Icon={MoreHorizIcon} label="More actions" count="" title="More arrives later." />
          )}
        </div>
      </div>

      <div className="border-b border-divider py-4">
        <div className="flex items-start gap-4">
          <Link href={channelHref} className="shrink-0" aria-label={video.channel.name}>
            <Avatar name={video.channel.name} url={video.channel.avatarUrl} size={48} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={channelHref} className="block truncate text-[14px] font-medium leading-5 text-text">
              {video.channel.name}
              <StaffBadge name={video.channel.handle} />
            </Link>
            <p className="text-[13px] leading-[18px] text-text-2">
              <SubscriberCount channelId={video.channel.id} count={video.channel.subscriberCount} />
            </p>
          </div>
          {video.isOwner ? (
            <Link href="/studio/videos" className="btn-blue shrink-0">
              Edit video
            </Link>
          ) : (
            <SubscribeButton channelId={video.channel.id} channelName={video.channel.name} count={video.channel.subscriberCount} />
          )}
        </div>
        <div className="mt-3 tab:ml-16">{children ?? <Description text={video.description} />}</div>
      </div>

      {downloadNote && (
        <div role="status" className="anim-in fixed bottom-6 left-6 z-[70] rounded-[4px] bg-[#323232] px-4 py-3 text-[14px] text-white shadow-lg">
          {downloadNote}
        </div>
      )}
      {sharing && <ShareDialog videoId={video.id} title={video.title} onClose={() => setSharing(false)} />}
      {report.dialog}
    </div>
  );
}

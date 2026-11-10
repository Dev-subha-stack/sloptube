"use client";

import { useEffect, useState } from "react";
import { ClockIcon, PlaylistAddIcon } from "@/components/icons";
import { AddToPlaylistModal } from "@/components/playlist/AddToPlaylistModal";
import { useWatchLater } from "@/lib/store/watchLater";
import { useSubscriptions } from "@/lib/store/subscriptions";
import { getClientVideo, type ClientVideo } from "@/lib/clientData";

export function VideoQuickActions({
  videoId,
  videoData,
}: {
  videoId: string;
  videoData?: Partial<ClientVideo>;
}) {
  const { has, toggle, load } = useWatchLater();
  const showToast = useSubscriptions((s) => s.showToast);
  const [inWatchLater, setInWatchLater] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setInWatchLater(has(videoId));
  }, [has, videoId]);

  const handleWatchLater = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const vid: ClientVideo = getClientVideo(videoId) || {
      id: videoId,
      title: videoData?.title || "Video",
      description: "",
      channelId: "c-apex-001",
      publishedAt: new Date().toISOString(),
      views: 1200,
      likes: 80,
      commentsCount: 12,
      durationS: videoData?.durationS || 300,
      thumbnail: videoData?.thumbnail || "",
      src: "",
    };

    const added = toggle(vid);
    setInWatchLater(added);
    showToast(added ? "Added to Watch Later" : "Removed from Watch Later");
  };

  const handlePlaylist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPlaylistModalOpen(true);
  };

  return (
    <>
      <div className="absolute right-1 top-1 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleWatchLater}
          title={inWatchLater ? "Remove from Watch Later" : "Watch Later"}
          aria-label="Watch Later"
          className={`grid h-7 w-7 place-items-center rounded-xs transition-colors shadow-md ${
            inWatchLater
              ? "bg-[var(--mark)] text-white"
              : "bg-black/80 text-white hover:bg-black"
          }`}
        >
          <ClockIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handlePlaylist}
          title="Add to playlist"
          aria-label="Add to playlist"
          className="grid h-7 w-7 place-items-center rounded-xs bg-black/80 text-white hover:bg-black shadow-md transition-colors"
        >
          <PlaylistAddIcon className="h-4 w-4" />
        </button>
      </div>

      <AddToPlaylistModal
        isOpen={playlistModalOpen}
        videoId={videoId}
        onClose={() => setPlaylistModalOpen(false)}
      />
    </>
  );
}

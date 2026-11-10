"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type DragEvent } from "react";
import { DeleteIcon, DragHandleIcon, PlayIcon, PlaylistAddIcon } from "@/components/icons";
import { Thumb } from "@/components/Thumb";
import { getClientVideo, type ClientVideo } from "@/lib/clientData";
import { usePlaylists, type Playlist } from "@/lib/store/playlists";
import { useSubscriptions } from "@/lib/store/subscriptions";
import { formatTime } from "@/lib/watch/format";

export function PlaylistDetailView() {
  const searchParams = useSearchParams();
  const playlistId = searchParams.get("list");
  const { playlists, loaded, load, reorderVideos, removeVideo } = usePlaylists();
  const showToast = useSubscriptions((s) => s.showToast);

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="h-8 w-48 bg-skeleton rounded-xs animate-pulse mb-6" />
      </div>
    );
  }

  const playlist: Playlist | undefined = playlists.find((p) => p.id === playlistId) || playlists[0];

  if (!playlist) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-16 text-center">
        <p className="text-[18px] text-text font-medium">Playlist not found</p>
        <Link href="/playlists" className="btn-blue mt-4">
          All Playlists
        </Link>
      </div>
    );
  }

  const videos: ClientVideo[] = playlist.videoIds
    .map((id) => getClientVideo(id))
    .filter((v): v is ClientVideo => Boolean(v));

  const totalDuration = videos.reduce((acc, v) => acc + v.durationS, 0);

  const handleDragStart = (e: DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overIdx !== index) {
      setOverIdx(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setOverIdx(null);
  };

  const handleDrop = (e: DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIndex) {
      setDraggedIdx(null);
      setOverIdx(null);
      return;
    }
    reorderVideos(playlist.id, draggedIdx, dropIndex);
    showToast("Playlist order updated");
    setDraggedIdx(null);
    setOverIdx(null);
  };

  const handleRemove = (videoId: string, title: string) => {
    removeVideo(playlist.id, videoId);
    showToast(`Removed "${title}" from playlist`);
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8">
        <div className="rounded-sm bg-surface border border-divider p-6 h-fit sticky top-20 shadow-xs">
          <div className="relative aspect-video w-full rounded-xs overflow-hidden bg-black mb-4">
            {videos[0] ? (
              <Thumb src={videos[0].thumbnail} alt={playlist.title} />
            ) : (
              <div className="grid h-full place-items-center text-text-3">Empty playlist</div>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              {videos[0] && (
                <Link
                  href={`/watch?v=${videos[0].id}&list=${playlist.id}`}
                  className="flex items-center gap-2 rounded-full bg-[var(--mark)] px-4 py-2 font-medium text-white shadow-lg"
                >
                  <PlayIcon className="h-5 w-5" /> Play All
                </Link>
              )}
            </div>
          </div>

          <h1 className="text-[22px] font-bold text-text leading-7">{playlist.title}</h1>
          <p className="mt-2 text-[13px] text-text-2 leading-relaxed">{playlist.description || "No description provided."}</p>

          <div className="mt-4 border-t border-divider pt-3 text-[12px] text-text-3 space-y-1">
            <p>{videos.length} videos · {formatTime(totalDuration)} total watch time</p>
            <p className="capitalize">Visibility: {playlist.visibility}</p>
          </div>

          {videos.length > 0 && (
            <Link
              href={`/watch?v=${videos[0].id}&list=${playlist.id}`}
              className="btn-blue w-full mt-6 flex items-center justify-center gap-2"
            >
              <PlayIcon className="h-5 w-5" /> Play All
            </Link>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between pb-3 border-b border-divider">
            <span className="text-[14px] font-medium text-text">Drag videos by the handle to reorder</span>
            <span className="text-[12px] text-text-3">{videos.length} items</span>
          </div>

          {videos.length === 0 ? (
            <div className="py-16 text-center text-text-2">
              <p>No videos in this playlist yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-divider/40">
              {videos.map((video, idx) => {
                const isDragging = draggedIdx === idx;
                const isOver = overIdx === idx;
                return (
                  <div
                    key={video.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, idx)}
                    className={`group flex items-center gap-3 py-2.5 px-3 rounded-xs transition-all ${
                      isDragging ? "opacity-30 bg-hover" : ""
                    } ${isOver ? "border-t-2 border-[var(--link)] bg-hover/80" : "hover:bg-hover/60"}`}
                  >
                    <div
                      className="cursor-grab active:cursor-grabbing text-icon/60 hover:text-text p-1 shrink-0"
                      title="Drag to reorder"
                    >
                      <DragHandleIcon className="h-5 w-5" />
                    </div>

                    <span className="text-[12px] text-text-3 w-4 text-center shrink-0">{idx + 1}</span>

                    <Link
                      href={`/watch?v=${video.id}&list=${playlist.id}`}
                      className="relative aspect-video w-[130px] shrink-0 overflow-hidden rounded-xs bg-skeleton"
                    >
                      <Thumb src={video.thumbnail} alt={video.title} />
                      <span className="absolute bottom-1 right-1 rounded-xs bg-black/80 px-1 text-[10px] font-medium text-white">
                        {formatTime(video.durationS)}
                      </span>
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/watch?v=${video.id}&list=${playlist.id}`}
                        className="text-[14px] font-medium text-text line-clamp-1 hover:underline"
                      >
                        {video.title}
                      </Link>
                      <p className="text-[12px] text-text-2">{formatTime(video.durationS)}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(video.id, video.title)}
                      title="Remove from playlist"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-icon hover:text-[var(--error)]"
                    >
                      <DeleteIcon className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

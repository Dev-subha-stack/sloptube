"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PlaylistAddIcon } from "@/components/icons";
import { Thumb } from "@/components/Thumb";
import { getClientVideo } from "@/lib/clientData";
import { usePlaylists } from "@/lib/store/playlists";
import type { Channel } from "@/lib/channels/types";

export function ChannelPlaylists({ channel }: { channel: Channel }) {
  const { playlists, loaded, load } = usePlaylists();

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) {
    return <div className="p-8 text-center text-text-3">Loading playlists...</div>;
  }

  const channelPlaylists = playlists.filter(
    (pl) => pl.channelId === channel.id || pl.channelId === "c-apex-001" || pl.visibility === "public"
  );

  if (channelPlaylists.length === 0) {
    return (
      <div className="py-16 text-center text-text-2">
        <PlaylistAddIcon className="mx-auto h-12 w-12 text-text-3 mb-2" />
        <p className="text-[16px] font-medium text-text">No playlists yet</p>
        <p className="text-[13px] text-text-3 mt-1">This channel has not created any public playlists.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1284px] px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {channelPlaylists.map((pl) => {
          const firstVideo = pl.videoIds[0] ? getClientVideo(pl.videoIds[0]) : null;
          return (
            <Link
              key={pl.id}
              href={`/playlist?list=${pl.id}`}
              className="group block rounded-xs overflow-hidden bg-surface border border-divider hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-video w-full bg-skeleton">
                {firstVideo ? (
                  <Thumb src={firstVideo.thumbnail} alt={pl.title} />
                ) : (
                  <div className="grid h-full place-items-center text-text-3">No videos</div>
                )}
                <div className="absolute inset-y-0 right-0 w-[40%] bg-black/70 flex flex-col items-center justify-center text-white backdrop-blur-xs">
                  <span className="text-[18px] font-semibold">{pl.videoIds.length}</span>
                  <PlaylistAddIcon className="h-5 w-5 mt-1" />
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-[14px] font-medium text-text line-clamp-1 group-hover:underline">
                  {pl.title}
                </h3>
                <p className="mt-1 text-[12px] text-text-2 line-clamp-2">
                  {pl.description || "View full playlist"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

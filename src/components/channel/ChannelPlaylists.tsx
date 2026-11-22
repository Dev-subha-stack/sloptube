"use client";

import { useEffect, useState } from "react";
import { PlaylistAddIcon } from "@/components/icons";
import { PlaylistCard } from "@/components/playlist/PlaylistCard";
import type { Channel } from "@/lib/channels/types";
import { publicPlaylistsOf, type PlaylistSummary } from "@/lib/store/playlists";

/** A channel's Playlists tab: the owner's public playlists. */
export function ChannelPlaylists({ channel }: { channel: Channel }) {
  const [list, setList] = useState<PlaylistSummary[] | null>(null);

  useEffect(() => {
    let live = true;
    void publicPlaylistsOf(channel.ownerId).then((l) => live && setList(l));
    return () => {
      live = false;
    };
  }, [channel.ownerId]);

  if (list === null) return <div className="p-8 text-center text-text-3">Loading playlists...</div>;
  if (list.length === 0) {
    return (
      <div className="py-16 text-center text-text-2">
        <PlaylistAddIcon className="mx-auto mb-2 h-12 w-12 text-text-3" />
        <p className="text-[16px] text-text">No playlists yet</p>
        <p className="mt-1 text-[13px] text-text-3">This channel has no public playlists.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[1284px] px-4 py-6 sm:px-6">
      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((pl) => (
          <PlaylistCard key={pl.id} playlist={pl} />
        ))}
      </div>
    </div>
  );
}

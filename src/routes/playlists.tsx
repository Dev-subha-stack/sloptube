// Ported page: the original app's /playlists.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import Link from "next/link";
import { useEffect } from "react";
import { PlaylistAddIcon } from "@/components/icons";
import { PlaylistCard } from "@/components/playlist/PlaylistCard";
import { usePlaylists } from "@/lib/store/playlists";
import { useSession } from "@/lib/store/session";

function PlaylistsIndexPage() {
  const user = useSession((s) => s.user);
  const loaded = useSession((s) => s.loaded);
  const { mine, loadMine } = usePlaylists();

  useEffect(() => {
    if (user) void loadMine();
  }, [user, loadMine]);

  if (loaded && !user) {
    return (
      <div className="flex flex-col items-center px-6 py-20 text-center">
        <PlaylistAddIcon className="h-16 w-16 text-text-3" />
        <p className="mt-4 text-[18px] text-text">Sign in to see your playlists</p>
        <Link href="/login?next=%2Fplaylists" className="btn-blue mt-6">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-6 sm:px-6" data-playlists={mine ? mine.length : "loading"}>
      <div className="mb-6 flex items-center gap-3 border-b border-divider pb-4">
        <PlaylistAddIcon className="h-7 w-7 text-[var(--mark)]" />
        <h1 className="text-[22px] leading-8 text-text">Your playlists</h1>
        {mine && <span className="text-[14px] text-text-2">({mine.length})</span>}
      </div>
      {mine === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-video rounded-[12px] bg-skeleton" />
          ))}
        </div>
      ) : mine.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[16px] text-text">No playlists yet</p>
          <p className="mt-1 text-[14px] text-text-2">Press Save under any video and choose Create new playlist.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mine.map((pl) => (
            <PlaylistCard key={pl.id} playlist={pl} showVisibility />
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/playlists")({

  loader: () => null,
  head: () => metadataToHead({ title: "Playlists | sloptube" }),
  component: PlaylistsIndexPage,
});

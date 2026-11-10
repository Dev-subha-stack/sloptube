// Ported page: the original app's /playlists.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import Link from "next/link";
import { useEffect } from "react";
import { PlaylistAddIcon } from "@/components/icons";
import { Thumb } from "@/components/Thumb";
import { getClientVideo } from "@/lib/clientData";
import { usePlaylists } from "@/lib/store/playlists";

function PlaylistsIndexPage() {
  const { playlists, loaded, load } = usePlaylists();

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) {
    return <div className="p-8">Loading playlists...</div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3 border-b border-divider pb-4 mb-6">
        <PlaylistAddIcon className="h-7 w-7 text-[var(--mark)]" />
        <h1 className="text-[24px] font-normal leading-8 text-text">Playlists</h1>
        <span className="text-[14px] text-text-2">({playlists.length})</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {playlists.map((pl) => {
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



export const Route = createFileRoute("/playlists")({

  loader: () => null,
  head: () => metadataToHead({ title: "Playlists | sloptube" }),
  component: PlaylistsIndexPage,
});

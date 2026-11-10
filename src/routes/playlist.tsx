// Ported page: the original app's /playlist.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { PlaylistDetailView } from "@/components/playlist/PlaylistDetailView";

const metadata = { title: "Playlist | sloptube" };

function PlaylistPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading playlist...</div>}>
      <PlaylistDetailView />
    </Suspense>
  );
}



export const Route = createFileRoute("/playlist")({

  loader: () => null,
  head: () => metadataToHead(metadata),
  component: PlaylistPage,
});

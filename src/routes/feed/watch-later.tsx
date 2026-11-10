// Ported page: the original app's /feed/watch-later.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { WatchLaterView } from "@/components/watchLater/WatchLaterView";

const metadata = { title: "Watch Later | sloptube" };

function WatchLaterPage() {
  return <WatchLaterView />;
}



export const Route = createFileRoute("/feed/watch-later")({

  loader: () => null,
  head: () => metadataToHead(metadata),
  component: WatchLaterPage,
});

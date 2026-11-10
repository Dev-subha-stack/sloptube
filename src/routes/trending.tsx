// Ported page: the original app's /trending.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { FeedView } from "@/components/feed/FeedView";

const metadata = { title: "Trending | sloptube" };

const loadFeed = createServerFn({ method: "GET" }).handler(async () => {
  const { feedState } = await import("@/lib/feed/server");
  const { shelfShorts } = await import("@/lib/shorts/server");
  void shelfShorts;
  const state = await feedState("trending");
  const shelf: Awaited<ReturnType<typeof shelfShorts>> = [];
  return { state, shelf };
});

function Page() {
  const data = Route.useLoaderData();
  return <FeedView kind="trending" title="Trending" placeholder={{ title: "Nothing is trending yet.", hint: "Trending arrives once there are videos to watch." }} data={data} />;
}


export const Route = createFileRoute("/trending")({

  loader: () => loadFeed(),
  head: () => metadataToHead(metadata),
  component: Page,
});

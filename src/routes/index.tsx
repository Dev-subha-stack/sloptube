// Ported page: the original app's /.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { FeedSkeleton, FeedView } from "@/components/feed/FeedView";

const metadata = { title: "sloptube", description: "A video platform, built in the open one feature at a time." };

const loadFeed = createServerFn({ method: "GET" }).handler(async () => {
  const { feedState } = await import("@/lib/feed/server");
  const { shelfShorts } = await import("@/lib/shorts/server");
  const state = await feedState("newest");
  const shelf = "newest" === "newest" && state.kind === "ready" ? await shelfShorts() : [];
  return { state, shelf };
});

function Page() {
  const data = Route.useLoaderData();
  return <FeedView kind="newest" title="Recommended" placeholder={{}} data={data} />;
}


export const Route = createFileRoute("/")({
  pendingComponent: () => <FeedSkeleton title="Recommended" />,

  loader: () => loadFeed(),
  head: () => metadataToHead(metadata),
  component: Page,
});

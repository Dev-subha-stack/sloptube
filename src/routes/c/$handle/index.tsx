// Ported page: the original app's /c/$handle/.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { ChannelSkeleton } from "@/components/channel/ChannelNotices";
import { ChannelView } from "@/components/channel/ChannelView";
import { loadChannel, type Tab } from "@/functions/channel.functions";

function Page() {
  const { segment, tab, data } = Route.useLoaderData();
  return <ChannelView segment={segment} tab={tab} data={data} />;
}


export const Route = createFileRoute("/c/$handle/")({
  pendingComponent: ChannelSkeleton,
  loader: async ({ params }) => {
    const tab = "home" as string;
    if (!["home", "videos", "shorts", "playlists", "about"].includes(tab)) throw routeNotFound();
    return loadChannel({ data: { segment: params.handle, tab: tab as Tab } });
  },
  head: ({ loaderData }) => loaderData?.meta ?? {},
  component: Page,
});

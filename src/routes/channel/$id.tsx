// Ported page: the original app's /channel/$id.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { ChannelMissing, ChannelsNotSetUp, ChannelsOff } from "@/components/channel/ChannelNotices";

const metadata = { title: "Channel | sloptube" };

const loadHandle = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { handleForChannelId } = await import("@/lib/channels/server");
    return handleForChannelId(data.id);
  });

function Page() {
  const state = Route.useLoaderData();
  if (state.kind === "off") return <ChannelsOff />;
  if (state.kind === "not-set-up") return <ChannelsNotSetUp />;
  return <ChannelMissing />;
}


export const Route = createFileRoute("/channel/$id")({

  loader: async ({ params }) => {
    const state = await loadHandle({ data: { id: params.id } });
    if (state.kind === "handle") throw routeRedirect({ href: `/@${state.handle}` });
    if (state.kind === "no-db") throw routeRedirect({ href: "/@someone" });
    return state;
  },
  head: () => metadataToHead(metadata),
  component: Page,
});

// Ported page: the original app's /studio/channel.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { FormSkeleton } from "@/components/auth/AuthCard";
import { ChannelsNotSetUp, ChannelsOff } from "@/components/channel/ChannelNotices";
import { ChannelEditor } from "@/components/studio/ChannelEditor";
import type { myChannel } from "@/lib/channels/server";
import { previewChannel } from "@/lib/channels/types";

const metadata = { title: "Channel customization | sloptube" };

function StudioGate() {
  const state = Route.useLoaderData();
  switch (state.kind) {
    case "off":
      return <ChannelsOff />;
    case "not-set-up":
      return <ChannelsNotSetUp />;
    case "no-db":
      return (
        <div data-channel-state="no-db">
          <div role="status" className="mb-6 rounded-sm border border-divider bg-surface px-4 py-3 text-[14px] leading-5 text-text">
            <p className="font-medium">database not connected</p>
            <p className="mt-1 text-text-2">
              This is a preview of the editor. Add the publishable key to <code>.env.local</code> (see{" "}
              <code>.env.example</code>) and restart to edit a real channel.
            </p>
          </div>
          <ChannelEditor channel={previewChannel("your_channel")} disabled />
        </div>
      );
    case "ready":
      return (
        <div data-channel-state="ready">
          <ChannelEditor channel={state.channel} />
        </div>
      );
  }
}

function StudioChannelPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
      <h1 className="text-[24px] font-normal leading-8 text-text">Channel customization</h1>
      <p className="mb-6 mt-1 text-[14px] text-text-2">Change how your channel looks to viewers.</p>
      <Suspense fallback={<FormSkeleton />}>
        <StudioGate />
      </Suspense>
    </div>
  );
}

const loadMyChannel = createServerFn({ method: "GET" }).handler(async () => {
  const { myChannel } = await import("@/lib/channels/server");
  return myChannel();
});


export const Route = createFileRoute("/studio/channel")({

  loader: async () => {
    const state = await loadMyChannel();
    if (state.kind === "signed-out") throw routeRedirect({ href: `/login?next=/studio/channel` });
    return state;
  },
  head: () => metadataToHead(metadata),
  component: StudioChannelPage,
});

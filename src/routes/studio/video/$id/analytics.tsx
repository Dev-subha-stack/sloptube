// Ported page: the original app's /studio/video/$id/analytics.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { ChannelMessage } from "@/components/channel/ChannelNotices";
import { StatsError, StatsNotSetUp, StatsOff } from "@/components/studio/analytics/StatsNotices";
import { VideoAnalyticsView } from "@/components/studio/analytics/VideoAnalyticsView";
import { PreviewNotice, StudioNoDb, StudioOff, StudioPage, StudioSkeleton } from "@/components/studio/StudioNotices";
import { parseRange, statsErrorMessage } from "@/lib/stats/rules";
import type { videoAnalytics } from "@/lib/stats/server";
import { UUID } from "@/lib/studio/http";

const metadata = { title: "Video analytics | sloptube" };

function VideoAnalyticsGate() {
  const state = Route.useLoaderData();
  switch (state.kind) {
    case "off":
      return <StudioOff />;
    case "stats-off":
      return <StatsOff />;
    case "no-db":
      return <StudioNoDb />;
    case "not-set-up":
      return <StatsNotSetUp />;
    case "signed-out":
      return null;
    case "missing":
      return (
        <div data-studio-state="missing">
          <ChannelMessage state="missing" title="This video isn't in your content">
            It may have been deleted for good, or it belongs to another channel.
          </ChannelMessage>
        </div>
      );
    case "error":
      return <StatsError message={statsErrorMessage(state.code)} />;
    case "ready":
      return (
        <StudioPage wide>
          <div data-studio-state="ready">
            {state.preview && <PreviewNotice />}
            <VideoAnalyticsView data={state.data} realtime={state.realtime} live={!state.preview} />
          </div>
        </StudioPage>
      );
  }
}

function VideoAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <StudioPage wide>
          <StudioSkeleton />
        </StudioPage>
      }
    >
      <VideoAnalyticsGate />
    </Suspense>
  );
}

const loadVideoAnalytics = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string; range?: string }) => d)
  .handler(async ({ data }) => {
    const { parseRange } = await import("@/lib/stats/rules");
    const { videoAnalytics } = await import("@/lib/stats/server");
    return videoAnalytics(data.id.toLowerCase(), parseRange(data.range));
  });


export const Route = createFileRoute("/studio/video/$id/analytics")({
  validateSearch: (s: Record<string, unknown>) => s as Record<string, string | undefined>,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ params, deps }) => {
    if (!UUID.test(params.id)) throw routeNotFound();
    const state = await loadVideoAnalytics({ data: { id: params.id, range: deps.search.range } });
    if (state.kind === "signed-out") throw routeRedirect({ href: `/login?next=/studio/video/${params.id}/analytics` });
    return state;
  },
  head: () => metadataToHead(metadata),
  component: VideoAnalyticsPage,
});

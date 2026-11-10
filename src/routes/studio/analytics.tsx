// Ported page: the original app's /studio/analytics.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { ChannelAnalyticsView } from "@/components/studio/analytics/ChannelAnalyticsView";
import { StatsError, StatsNotSetUp, StatsOff } from "@/components/studio/analytics/StatsNotices";
import { PreviewNotice, StudioNoDb, StudioOff, StudioPage, StudioSkeleton } from "@/components/studio/StudioNotices";
import { parseRange, statsErrorMessage } from "@/lib/stats/rules";
import type { channelAnalytics } from "@/lib/stats/server";

const metadata = { title: "Channel analytics | sloptube" };

function AnalyticsGate() {
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
    case "error":
      return <StatsError message={statsErrorMessage(state.code)} />;
    case "ready":
      return (
        <StudioPage wide>
          <div data-studio-state="ready">
            {state.preview && <PreviewNotice />}
            <ChannelAnalyticsView data={state.data} realtime={state.realtime} live={!state.preview} />
          </div>
        </StudioPage>
      );
  }
}

function StudioAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <StudioPage wide>
          <StudioSkeleton />
        </StudioPage>
      }
    >
      <AnalyticsGate />
    </Suspense>
  );
}

const loadAnalytics = createServerFn({ method: "GET" })
  .inputValidator((d: { range?: string }) => d)
  .handler(async ({ data }) => {
    const { parseRange } = await import("@/lib/stats/rules");
    const { channelAnalytics } = await import("@/lib/stats/server");
    return channelAnalytics(parseRange(data.range));
  });


export const Route = createFileRoute("/studio/analytics")({
  validateSearch: (s: Record<string, unknown>) => s as Record<string, string | undefined>,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }) => {
    const state = await loadAnalytics({ data: { range: deps.search.range } });
    if (state.kind === "signed-out") throw routeRedirect({ href: `/login?next=/studio/analytics` });
    return state;
  },
  head: () => metadataToHead(metadata),
  component: StudioAnalyticsPage,
});

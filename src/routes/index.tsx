// Ported page: the original app's /. Home lists every public video, newest upload first.
import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { FeedSkeleton, FeedView, type FeedViewData } from "@/components/feed/FeedView";

const metadata = { title: "sloptube", description: "A video platform, built in the open one feature at a time." };

/** How long the home list counts as fresh: coming back within this shows it instantly with no new read. */
const HOME_STALE_MS = 5 * 60 * 1000;

const loadHome = createServerFn({ method: "GET" }).handler(async (): Promise<FeedViewData> => {
  const { homeState } = await import("@/lib/feed/server");
  const { shelfShorts } = await import("@/lib/shorts/server");
  const state = await homeState();
  const shelf = state.kind === "ready" ? await shelfShorts() : [];
  return { state, shelf };
});

const homeQuery = queryOptions({
  queryKey: ["home-videos"],
  queryFn: () => loadHome(),
  staleTime: HOME_STALE_MS,
  gcTime: 30 * 60 * 1000,
});

function Page() {
  const initial = Route.useLoaderData();
  // The loader's copy seeds the cache on the first visit; later visits read the cache.
  const { data } = useQuery({
    ...homeQuery,
    initialData: initial,
    ...(initial.state.kind === "ready" ? { initialDataUpdatedAt: initial.state.now } : {}),
  });
  return <FeedView kind="newest" title="Recommended" placeholder={{}} data={data} />;
}

export const Route = createFileRoute("/")({
  pendingComponent: () => <FeedSkeleton title="Recommended" />,
  pendingMs: 150,
  pendingMinMs: 200,
  // Cached list returns at once; a list older than 5 minutes refreshes in the background.
  loader: ({ context }) => context.queryClient.ensureQueryData({ ...homeQuery, revalidateIfStale: true }),
  head: () => metadataToHead(metadata),
  component: Page,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-center text-text-2">
      {error instanceof Error ? error.message : "Couldn't load videos."}
    </div>
  ),
});

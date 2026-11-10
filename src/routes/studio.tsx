// Ported page: the original app's /studio.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Outlet } from "@tanstack/react-router";
import { StudioNav } from "@/components/studio/StudioNav";
import { StudioSkeleton } from "@/components/studio/StudioNotices";

const loadNav = createServerFn({ method: "GET" }).handler(async () => {
  const { studioOn } = await import("@/lib/studio/server");
  if (!(await studioOn())) return null;
  const { getCurrentUser } = await import("@/lib/auth");
  const { statsOn } = await import("@/lib/stats/server");
  const [user, stats] = await Promise.all([getCurrentUser(), statsOn()]);
  return {
    statsOn: stats,
    channel: {
      name: user?.displayName || user?.username || "Your channel",
      handle: user?.channelHandle ?? null,
      avatarUrl: user?.avatarUrl ?? null,
    },
  };
});

function StudioLayout() {
  const nav = Route.useLoaderData();
  return (
    <div className="tab:flex">
      {nav && <StudioNav statsOn={nav.statsOn} channel={nav.channel} />}
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}


export const Route = createFileRoute("/studio")({
  ssr: false,
  pendingComponent: () => (
    <div className="px-4 py-6 sm:px-8">
      <StudioSkeleton />
    </div>
  ),
  loader: () => loadNav(),
  head: () => metadataToHead({ title: "Studio | sloptube" }),
  component: StudioLayout,
});

// Ported page: the original app's /studio/content/.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { ContentPage } from "@/components/studio/ContentPage";

const metadata = { title: "Channel content | sloptube" };

const loadContent = createServerFn({ method: "GET" }).handler(async () => {
  const { studioContent } = await import("@/lib/studio/server");
  const { statsOn } = await import("@/lib/stats/server");
  const [state, stats] = await Promise.all([studioContent(false), statsOn()]);
  return { state, stats };
});

function Page() {
  return <ContentPage trash={false} data={Route.useLoaderData()} />;
}


export const Route = createFileRoute("/studio/content/")({

  loader: async () => {
    const r = await loadContent();
    if (r.state.kind === "signed-out") throw routeRedirect({ href: `/login?next=/studio/content` });
    return r;
  },
  head: () => metadataToHead(metadata),
  component: Page,
});

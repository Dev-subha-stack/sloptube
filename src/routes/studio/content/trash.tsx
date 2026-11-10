// Ported page: the original app's /studio/content/trash.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { ContentPage } from "@/components/studio/ContentPage";

const metadata = { title: "Trash | sloptube" };

const loadContent = createServerFn({ method: "GET" }).handler(async () => {
  const { studioContent } = await import("@/lib/studio/server");
  const { statsOn } = await import("@/lib/stats/server");
  const [state, stats] = await Promise.all([studioContent(true), statsOn()]);
  return { state, stats };
});

function Page() {
  return <ContentPage trash={true} data={Route.useLoaderData()} />;
}


export const Route = createFileRoute("/studio/content/trash")({

  loader: async () => {
    const r = await loadContent();
    if (r.state.kind === "signed-out") throw routeRedirect({ href: `/login?next=/studio/content/trash` });
    return r;
  },
  head: () => metadataToHead(metadata),
  component: Page,
});

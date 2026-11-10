// Ported page: the original app's /shorts/.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { ShortsView } from "@/components/shorts/ShortsView";

const metadata = { title: "Snips | sloptube" };

const loadShorts = createServerFn({ method: "GET" }).handler(async () => {
  const { shortsState } = await import("@/lib/shorts/server");
  return shortsState(null);
});

function Page() {
  return <ShortsView state={Route.useLoaderData()} />;
}


export const Route = createFileRoute("/shorts/")({

  loader: () => loadShorts(),
  head: () => metadataToHead(metadata),
  component: Page,
});

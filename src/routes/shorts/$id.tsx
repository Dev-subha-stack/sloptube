// Ported page: the original app's /shorts/$id.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import type { Metadata } from "next";
import { ShortsView } from "@/components/shorts/ShortsView";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const startOf = (id: string) => (UUID.test(id) ? id.toLowerCase() : "00000000-0000-4000-8000-000000000000");

const loadShort = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { shortsState } = await import("@/lib/shorts/server");
    const { shortPageMetadata } = await import("@/lib/seo/pages");
    const start = startOf(data.id);
    const [state, meta] = await Promise.all([shortsState(start), shortPageMetadata(start)]);
    return { state, meta: metadataToHead(meta as Metadata) };
  });

function Page() {
  const { state } = Route.useLoaderData();
  return <ShortsView state={state} />;
}


export const Route = createFileRoute("/shorts/$id")({

  loader: async ({ params }) => {
    const r = await loadShort({ data: { id: params.id } });
    if (r.state.kind === "not-a-short") throw routeRedirect({ href: `/watch?v=${r.state.id}` });
    return r;
  },
  head: ({ loaderData }) => loaderData?.meta ?? {},
  component: Page,
});

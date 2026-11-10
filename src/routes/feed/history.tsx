// Ported page: the original app's /feed/history.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { HistoryView } from "@/components/history/HistoryView";

const metadata = { title: "History | sloptube" };

const loadHistory = createServerFn({ method: "GET" }).handler(async () => {
  const { historyPage } = await import("@/lib/engagement/server");
  return historyPage();
});

function Page() {
  return <HistoryView state={Route.useLoaderData()} />;
}


export const Route = createFileRoute("/feed/history")({
  ssr: false,
  loader: () => loadHistory(),
  head: () => metadataToHead(metadata),
  component: Page,
});

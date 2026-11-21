// Ported page: the original app's /feed/subscriptions.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { SubscriptionsSkeleton, SubscriptionsView } from "@/components/subscriptions/SubscriptionsView";

const metadata = { title: "Subscriptions | sloptube" };

const loadSubs = createServerFn({ method: "GET" }).handler(async () => {
  const { subscribedChannels } = await import("@/lib/subscriptions/server");
  return subscribedChannels();
});

function Page() {
  return <SubscriptionsView state={Route.useLoaderData()} />;
}


export const Route = createFileRoute("/feed/subscriptions")({
  ssr: false,
  pendingComponent: SubscriptionsSkeleton,
  loader: () => loadSubs(),
  head: () => metadataToHead(metadata),
  component: Page,
});

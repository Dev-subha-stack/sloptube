// Ported page: the original app's /admin/.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { AdminChannels } from "@/components/admin/AdminChannels";
import { AdminQueue } from "@/components/admin/AdminQueue";
import { AdminError, AdminShell } from "@/components/admin/AdminShell";
import type { adminGate, adminQueue, adminSuspended, findChannel, serverNow } from "@/lib/moderation/server";

const metadata = { title: "Reports | sloptube admin", robots: { index: false } };

function QueueGate() {
  const { preview, query, groups, suspended, found, now } = Route.useLoaderData();
  return (
    <AdminShell tab="queue" title="Reports" hint="Open reports grouped by what they point at, appeals first." preview={preview}>
      {"error" in groups ? <AdminError code={groups.error} /> : <AdminQueue groups={groups} now={now} preview={preview} />}
      <AdminChannels suspended={suspended} found={found} query={query} preview={preview} />
    </AdminShell>
  );
}

/** /admin: the moderation queue. Admins only (profiles.role, set in SQL); a 404 for everyone else. */
function AdminPage() {
  return (
    <Suspense fallback={null}>
      <QueueGate />
    </Suspense>
  );
}

const loadQueue = createServerFn({ method: "GET" })
  .inputValidator((d: { channel?: string }) => d)
  .handler(async ({ data }) => {
    const m = await import("@/lib/moderation/server");
    const gate = await m.adminGate();
    if (gate.kind === "hidden") return { hidden: true as const };
    const query = typeof data.channel === "string" ? data.channel.slice(0, 40) : "";
    const [groups, suspended, found] = await Promise.all([
      m.adminQueue(gate),
      m.adminSuspended(gate),
      query ? m.findChannel(gate, query) : null,
    ]);
    return { preview: gate.kind === "preview", query, groups, suspended, found, now: m.serverNow() };
  });


export const Route = createFileRoute("/admin/")({
  validateSearch: (s: Record<string, unknown>) => s as Record<string, string | undefined>,
  loaderDeps: ({ search }) => ({ search }),
  ssr: false,
  loader: async ({ deps }) => {
    const r = await loadQueue({ data: { channel: deps.search.channel } });
    if ("hidden" in r) throw routeNotFound();
    return r;
  },
  head: () => metadataToHead(metadata),
  component: AdminPage,
});

// Ported page: the original app's /admin/log.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { AdminLog } from "@/components/admin/AdminLog";
import { AdminError, AdminShell } from "@/components/admin/AdminShell";
import type { adminGate, adminLog } from "@/lib/moderation/server";

const metadata = { title: "Mod log | sloptube admin", robots: { index: false } };

function LogGate() {
  const { gate, entries } = Route.useLoaderData();
  return (
    <AdminShell tab="log" title="Mod log" hint="Every moderation action: who, what, on what, and why." preview={gate.kind === "preview"}>
      {"error" in entries ? <AdminError code={entries.error} /> : <AdminLog entries={entries} />}
    </AdminShell>
  );
}

function AdminLogPage() {
  return (
    <Suspense fallback={null}>
      <LogGate />
    </Suspense>
  );
}

const loadLog = createServerFn({ method: "GET" })
  .inputValidator((d: { before?: string }) => d)
  .handler(async ({ data }) => {
    const m = await import("@/lib/moderation/server");
    const gate = await m.adminGate();
    if (gate.kind === "hidden") return { hidden: true as const };
    const raw = typeof data.before === "string" ? data.before : null;
    const before = raw && Number.isFinite(Date.parse(raw)) ? new Date(raw).toISOString() : null;
    const entries = await m.adminLog(gate, before);
    return { gate: { kind: gate.kind }, entries };
  });


export const Route = createFileRoute("/admin/log")({
  validateSearch: (s: Record<string, unknown>) => s as Record<string, string | undefined>,
  loaderDeps: ({ search }) => ({ search }),
  ssr: false,
  loader: async ({ deps }) => {
    const r = await loadLog({ data: { before: deps.search.before } });
    if ("hidden" in r) throw routeNotFound();
    return r;
  },
  head: () => metadataToHead(metadata),
  component: AdminLogPage,
});

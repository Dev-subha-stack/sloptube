// Ported page: the original app's /admin/messages.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { AdminMessages } from "@/components/admin/AdminMessages";
import { AdminShell } from "@/components/admin/AdminShell";
import { launchErrorMessage } from "@/lib/launch/rules";
import type { adminMessages } from "@/lib/launch/server";
import type { serverNow } from "@/lib/moderation/server";

const metadata = { title: "Messages | sloptube admin", robots: { index: false } };

function MessagesGate() {
  const { state, all, now } = Route.useLoaderData();
  if (state.kind === "hidden") return null;
  return (
    <AdminShell tab="messages" title="Messages" hint="What people sent with the contact form, newest first." preview={state.preview}>
      {state.kind === "off" ? (
        <p className="rounded-[2px] bg-surface px-4 py-6 text-center text-[14px] text-text-2" data-admin-error="launch_off">
          The contact form is behind the <code>launch</code> flag. Switch it on to collect messages.
        </p>
      ) : state.kind === "error" ? (
        <p className="rounded-[2px] bg-surface px-4 py-6 text-center text-[14px] text-text-2" data-admin-error={state.code}>
          {launchErrorMessage(state.code)}
        </p>
      ) : (
        <AdminMessages messages={state.messages} now={now} preview={state.preview} all={all} />
      )}
    </AdminShell>
  );
}

/** /admin/messages: the contact form's inbox. Admins only; a 404 for everyone else. */
function AdminMessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesGate />
    </Suspense>
  );
}

const loadMessages = createServerFn({ method: "GET" })
  .inputValidator((d: { all?: string }) => d)
  .handler(async ({ data }) => {
    const { adminMessages } = await import("@/lib/launch/server");
    const { serverNow } = await import("@/lib/moderation/server");
    const all = data.all === "1";
    const state = await adminMessages(all);
    return { state, all, now: serverNow() };
  });


export const Route = createFileRoute("/admin/messages")({
  validateSearch: (s: Record<string, unknown>) => s as Record<string, string | undefined>,
  loaderDeps: ({ search }) => ({ search }),
  ssr: false,
  loader: async ({ deps }) => {
    const r = await loadMessages({ data: { all: deps.search.all } });
    if (r.state.kind === "hidden") throw routeNotFound();
    return r;
  },
  head: () => metadataToHead(metadata),
  component: AdminMessagesPage,
});

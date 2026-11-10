// Ported page: the original app's /admin/words.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { AdminError, AdminShell } from "@/components/admin/AdminShell";
import { AdminWords } from "@/components/admin/AdminWords";
import type { adminGate, adminWords } from "@/lib/moderation/server";

const metadata = { title: "Word list | sloptube admin", robots: { index: false } };

function WordsGate() {
  const { gate, words } = Route.useLoaderData();
  return (
    <AdminShell
      tab="words"
      title="Word list"
      hint="Comments, video titles and descriptions with one of these as a whole word are refused. A * at the end matches any ending."
      preview={gate.kind === "preview"}
    >
      {"error" in words ? <AdminError code={words.error} /> : <AdminWords words={words} preview={gate.kind === "preview"} />}
    </AdminShell>
  );
}

function AdminWordsPage() {
  return (
    <Suspense fallback={null}>
      <WordsGate />
    </Suspense>
  );
}

const loadWords = createServerFn({ method: "GET" }).handler(async () => {
  const m = await import("@/lib/moderation/server");
  const gate = await m.adminGate();
  if (gate.kind === "hidden") return { hidden: true as const };
  return { gate: { kind: gate.kind }, words: await m.adminWords(gate) };
});


export const Route = createFileRoute("/admin/words")({
  ssr: false,
  loader: async () => {
    const r = await loadWords();
    if ("hidden" in r) throw routeNotFound();
    return r;
  },
  head: () => metadataToHead(metadata),
  component: AdminWordsPage,
});

// Ported page: the original app's /embed/$id.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import type { Metadata } from "next";
import { Suspense } from "react";
import { ErrorIcon } from "@/components/icons";
import { Player } from "@/components/watch/Player";
import { watchPath } from "@/lib/seo/meta";
import type { embedState } from "@/lib/yapin/server";
import { siteConfig } from "@/site.config";

// /embed/<id> (feature 16): the player alone, for the playable cards Yapin'
// and other chat apps show from og:video and twitter:player. Only Yapin',
// yapper.website and this site may frame it (frame-ancestors in
// next.config.ts). The root layout's top bar, guide and footer are hidden by
// the [data-embed-page] rule in globals.css.

function Message({ state, title }: { state: string; title: string }) {
  return (
    <div data-embed-state={state} className="grid h-full w-full place-items-center bg-black p-6 text-center">
      <div>
        <ErrorIcon className="mx-auto mb-3 h-12 w-12 text-[#909090]" />
        <p className="text-[18px] text-white">{title}</p>
      </div>
    </div>
  );
}

function Embed() {
  const { state } = Route.useLoaderData();
  if (state.kind === "no-db") return <Message state="no-db" title="database not connected" />;
  if (state.kind === "off") return <Message state="off" title="Embedding isn't switched on here" />;
  if (state.kind === "missing") return <Message state="missing" title="Video unavailable" />;
  const { video } = state;
  return (
    <div data-embed-state="ready" className="relative h-full w-full">
      <Player
        key={video.id}
        videoId={video.id}
        src={video.src}
        poster={video.thumbnail}
        spriteVtt={video.spriteVtt}
        durationS={video.durationS}
        startAt={0}
        embed
      />
      {/* The title links to the watch page in a new tab, like YouTube's embeds. */}
      <a
        href={watchPath(video.id)}
        target="_blank"
        rel="noopener"
        data-embed-title
        className="absolute left-0 right-16 top-0 truncate bg-gradient-to-b from-black/70 to-transparent px-4 pb-6 pt-3 text-[16px] text-white hover:underline"
      >
        {video.title}
        <span className="block text-[12px] text-[#cccccc]">{video.channel.name} on {siteConfig.siteName}</span>
      </a>
    </div>
  );
}

function EmbedPage() {
  return (
    <div data-embed-page className="fixed inset-0 z-[1000] bg-black">
      <Suspense fallback={<div className="h-full w-full bg-black" />}>
        <Embed />
      </Suspense>
    </div>
  );
}

const loadEmbed = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { embedState } = await import("@/lib/yapin/server");
    const { seoVideo } = await import("@/lib/seo/pages");
    const { siteOrigin } = await import("@/lib/seo/origin");
    const { embedMetadata } = await import("@/lib/seo/meta");
    const { embedCsp } = await import("@/lib/yapin/rules");
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Content-Security-Policy", embedCsp());
    const state = await embedState(data.id);
    const meta: Metadata =
      state.kind === "ready"
        ? embedMetadata(seoVideo(state.video), await siteOrigin(), siteConfig.siteName)
        : { title: `Video unavailable | ${siteConfig.siteName}`, robots: { index: false, follow: false } };
    return { state, meta: metadataToHead(meta) };
  });


export const Route = createFileRoute("/embed/$id")({

  loader: ({ params }) => loadEmbed({ data: { id: params.id } }),
  head: ({ loaderData }) => loaderData?.meta ?? {},
  component: EmbedPage,
});

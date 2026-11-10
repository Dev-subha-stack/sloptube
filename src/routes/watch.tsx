// Ported page: the original app's /watch.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { ChannelMessage } from "@/components/channel/ChannelNotices";
import { CommentsSection, CommentsUnavailable } from "@/components/comments/CommentsSection";
import { ErrorIcon } from "@/components/icons";
import { WatchProcessing } from "@/components/processing/WatchProcessing";
import { Player } from "@/components/watch/Player";
import { UpNext } from "@/components/watch/UpNext";
import { VideoInfo } from "@/components/watch/VideoInfo";
import { WatchLayout } from "@/components/watch/WatchLayout";
import { WatchSkeleton } from "@/components/watch/WatchSkeleton";
import { WatchStub } from "@/components/watch/WatchStub";
import { jsonLdText, videoJsonLd } from "@/lib/seo/meta";
import { seoVideo } from "@/lib/seo/convert";
import { parseStart } from "@/lib/watch/format";
import type { watchPageState } from "@/lib/watch/server";
import type { WatchVideo } from "@/lib/watch/types";

/** Title, description, canonical link and share cards from the same state the page shows. */

/** schema.org VideoObject for search engines, on public videos only. */
function VideoJsonLd({ video, origin }: { video: WatchVideo; origin: string }) {
  if (video.visibility !== "public") return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(videoJsonLd(seoVideo(video), origin)) }} />;
}

/** The black 16:9 area with a message in it, where the player would be. */
function PlayerMessage({ title, children, spinner = false }: { title: string; children?: ReactNode; spinner?: boolean }) {
  return (
    <div className="grid h-full w-full place-items-center bg-black p-6 text-center">
      <div>
        {spinner ? (
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#555] border-t-white" />
        ) : (
          <ErrorIcon className="mx-auto mb-3 h-12 w-12 text-[#909090]" />
        )}
        <p className="text-[18px] text-white">{title}</p>
        {children && <p className="mt-1 text-[13px] text-[#aaaaaa]">{children}</p>}
      </div>
    </div>
  );
}

/** A message in the player area, with the title under it when there is one. */
function MessageLayout({ state, box, title }: { state: string; box: ReactNode; title?: string }) {
  return (
    <div data-watch-state={state}>
      <WatchLayout
        player={box}
        info={title ? <h1 className="px-3 pt-3 text-[18px] leading-[26px] text-text tab:px-0 tab:pt-5">{title}</h1> : null}
        side={null}
      />
    </div>
  );
}

function Watch() {
  const params = Route.useSearch();
  const t = typeof params.t === "string" ? params.t : null;
  const { state, stub, origin } = Route.useLoaderData();

  switch (state.kind) {
    case "off":
      return (
        <div data-watch-state="off">
          {stub ? <WatchStub state={stub} /> : null}
        </div>
      );
    case "no-db":
      return (
        <div data-watch-state="no-db">
          <ChannelMessage state="no-db" title="database not connected">
            Add the publishable key to <code>.env.local</code> (see <code>.env.example</code>) and restart to watch videos.
          </ChannelMessage>
        </div>
      );
    case "not-set-up":
      return (
        <div data-watch-state="not-set-up">
          <ChannelMessage state="not-set-up" title="The watch page isn't set up yet">
            Run <code>supabase/migrations/007_watch.sql</code> in the Supabase SQL editor.
          </ChannelMessage>
        </div>
      );
    case "missing":
      return (
        <MessageLayout
          state="missing"
          box={<PlayerMessage title="Video unavailable">This video is private, or the link is wrong.</PlayerMessage>}
        />
      );
    case "processing":
      return (
        <MessageLayout
          state="processing"
          title={state.title}
          box={
            <PlayerMessage title="This video is being processed" spinner>
              Check back in a few minutes.
            </PlayerMessage>
          }
        />
      );
    case "owner-processing": {
      const { video, live, processingOn } = state;
      const failed = live.status === "failed";
      const box = failed ? (
        <PlayerMessage title="This upload failed">Only you see this. Upload the file again from /upload.</PlayerMessage>
      ) : processingOn ? (
        <div className="grid h-full w-full place-items-center bg-black text-center">
          <WatchProcessing video={live} />
        </div>
      ) : (
        <PlayerMessage title="Processing" spinner>
          Only you see this. Check back in a few minutes.
        </PlayerMessage>
      );
      return (
        <div data-watch-state="owner-processing" data-status={live.status}>
          <WatchLayout player={box} info={<VideoInfo video={video} />} side={<UpNext videos={[]} channel={video.channel} />} />
        </div>
      );
    }
    case "ready": {
      const { video, upNext, preview, engagement, comments } = state;
      return (
        <div data-watch-state="ready" data-preview={preview ? "1" : undefined}>
          {!preview && <VideoJsonLd video={video} origin={origin} />}
          <WatchLayout
            player={
              <Player
                key={video.id}
                videoId={video.id}
                src={video.src}
                poster={video.thumbnail}
                spriteVtt={video.spriteVtt}
                durationS={video.durationS}
                startAt={parseStart(t)}
                engagement={engagement}
              />
            }
            info={<VideoInfo video={video} engagement={engagement} />}
            side={<UpNext videos={upNext} channel={video.channel} />}
            comments={
              comments === "no-db" ? (
                <CommentsUnavailable />
              ) : comments ? (
                <CommentsSection
                  key={video.id}
                  videoId={video.id}
                  initial={comments}
                  channel={{ name: video.channel.name, avatarUrl: video.channel.avatarUrl }}
                />
              ) : null
            }
          />
        </div>
      );
    }
  }
}



const loadWatch = createServerFn({ method: "GET" })
  .inputValidator((d: { v: string | null }) => d)
  .handler(async ({ data }) => {
    const { watchPageState } = await import("@/lib/watch/server");
    const { watchPageMetadata } = await import("@/lib/seo/pages");
    const { siteOrigin } = await import("@/lib/seo/origin");
    const [state, meta, origin] = await Promise.all([watchPageState(data.v), watchPageMetadata(data.v), siteOrigin()]);
    let stub = null as Awaited<ReturnType<typeof import("@/lib/upload/server").videoForWatch>> | null;
    if (state.kind === "off") {
      const { videoForWatch } = await import("@/lib/upload/server");
      stub = await videoForWatch(data.v);
    }
    return { state, stub, origin, meta: metadataToHead(meta as Metadata) };
  });


export const Route = createFileRoute("/watch")({
  validateSearch: (s: Record<string, unknown>) => s as Record<string, string | undefined>,
  loaderDeps: ({ search }) => ({ search }),
  pendingComponent: WatchSkeleton,
  loader: ({ deps }) => loadWatch({ data: { v: typeof deps.search.v === "string" ? deps.search.v : null } }),
  head: ({ loaderData }) => loaderData?.meta ?? {},
  component: Watch,
});

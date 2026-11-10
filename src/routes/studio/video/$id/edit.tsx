// Ported page: the original app's /studio/video/$id/edit.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { ChannelMessage } from "@/components/channel/ChannelNotices";
import { PreviewNotice, StudioNoDb, StudioNotSetUp, StudioOff, StudioPage } from "@/components/studio/StudioNotices";
import { VideoEditor } from "@/components/studio/VideoEditor";
import { UUID } from "@/lib/studio/http";
import type { statsOn } from "@/lib/stats/server";
import type { studioVideo } from "@/lib/studio/server";

const metadata = { title: "Video details | sloptube" };

function EditGate() {
  const { state, stats } = Route.useLoaderData();
  switch (state.kind) {
    case "off":
      return <StudioOff />;
    case "no-db":
      return <StudioNoDb />;
    case "not-set-up":
      return <StudioNotSetUp />;
    case "signed-out":
      return null;
    case "missing":
      return (
        <div data-studio-state="missing">
          <ChannelMessage state="missing" title="This video isn't in your content">
            It may be in the trash, or it belongs to another channel.
          </ChannelMessage>
        </div>
      );
    case "ready":
      return (
        <StudioPage wide>
          <div data-studio-state="ready">
            {state.preview && <PreviewNotice />}
            <VideoEditor
              video={state.video}
              stills={state.stills}
              custom={state.custom}
              channelDefault={state.channelDefault}
              commentsOn={state.commentsOn}
              shortsOn={state.shortsOn}
              uploadsConfigured={state.uploadsConfigured}
              preview={state.preview}
              statsOn={stats}
            />
          </div>
        </StudioPage>
      );
  }
}

function StudioEditPage() {
  return (
    <Suspense fallback={<StudioPage wide>{null}</StudioPage>}>
      <EditGate />
    </Suspense>
  );
}

const loadEdit = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { studioVideo } = await import("@/lib/studio/server");
    const { statsOn } = await import("@/lib/stats/server");
    const [state, stats] = await Promise.all([studioVideo(data.id.toLowerCase()), statsOn()]);
    return { state, stats };
  });


export const Route = createFileRoute("/studio/video/$id/edit")({

  loader: async ({ params }) => {
    if (!UUID.test(params.id)) throw routeNotFound();
    const r = await loadEdit({ data: { id: params.id } });
    if (r.state.kind === "signed-out") throw routeRedirect({ href: `/login?next=/studio/video/${params.id}/edit` });
    return r;
  },
  head: () => metadataToHead(metadata),
  component: StudioEditPage,
});

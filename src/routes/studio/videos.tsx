// Ported page: the original app's /studio/videos.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import Link from "next/link";
import { Suspense } from "react";
import { UploadMessage, UploadsOff } from "@/components/upload/UploadNotices";
import { VideoTable, VideoTableSkeleton } from "@/components/upload/VideoTable";
import type { studioOn } from "@/lib/studio/server";
import type { myVideos } from "@/lib/upload/server";

const metadata = { title: "Channel videos | sloptube" };

function VideosGate() {
  const state = Route.useLoaderData();
  switch (state.kind) {
    case "off":
      return <UploadsOff />;
    case "not-set-up":
      return (
        <UploadMessage state="not-set-up" title="Videos aren't set up yet">
          The videos table could not be read. Run <code>supabase/migrations/005_videos.sql</code> in the Supabase SQL
          editor, then reload.
        </UploadMessage>
      );
    case "no-db":
      return (
        <div data-upload-state="no-db">
          <div role="status" className="mb-6 rounded-sm border border-divider bg-surface px-4 py-3 text-[14px] leading-5 text-text">
            <p className="font-medium">database not connected</p>
            <p className="mt-1 text-text-2">
              Add the publishable key to <code>.env.local</code> (see <code>.env.example</code>) and restart to see
              your uploads here.
            </p>
          </div>
          <VideoTable videos={[]} />
        </div>
      );
    case "preview":
      return (
        <div data-upload-state="preview">
          <div role="status" className="mb-6 rounded-sm border border-divider bg-surface px-4 py-3 text-[14px] leading-5 text-text">
            <p className="font-medium">database not connected</p>
            <p className="mt-1 text-text-2">
              This is a preview with sample videos. Add the publishable key to <code>.env.local</code> (see{" "}
              <code>.env.example</code>) and restart to see your uploads.
            </p>
          </div>
          <VideoTable videos={state.videos} />
        </div>
      );
    case "ready":
      return (
        <div data-upload-state="ready">
          <VideoTable videos={state.videos} poll={state.processingOn} />
        </div>
      );
  }
}

function StudioVideosPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-normal leading-8 text-text">Channel videos</h1>
          <p className="mt-1 text-[14px] text-text-2">Your uploads and where each one is. Editing comes later.</p>
        </div>
        <Link href="/upload" className="btn-blue">
          Upload video
        </Link>
      </div>
      <Suspense fallback={<VideoTableSkeleton />}>
        <VideosGate />
      </Suspense>
    </div>
  );
}

const loadVideos = createServerFn({ method: "GET" }).handler(async () => {
  const { studioOn } = await import("@/lib/studio/server");
  if (await studioOn()) return { kind: "studio" as const };
  const { myVideos } = await import("@/lib/upload/server");
  return myVideos();
});


export const Route = createFileRoute("/studio/videos")({

  loader: async () => {
    const state = await loadVideos();
    if (state.kind === "studio") throw routeRedirect({ href: "/studio/content" });
    if (state.kind === "signed-out") throw routeRedirect({ href: `/login?next=/studio/videos` });
    return state;
  },
  head: () => metadataToHead(metadata),
  component: StudioVideosPage,
});

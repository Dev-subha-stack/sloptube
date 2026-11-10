// Ported page: the original app's /studio/comments.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { ChannelMessage } from "@/components/channel/ChannelNotices";
import { StudioComments } from "@/components/comments/StudioComments";
import type { studioComments } from "@/lib/comments/server";

const metadata = { title: "Channel comments | sloptube" };

function CommentsGate() {
  const state = Route.useLoaderData();
  switch (state.kind) {
    case "off":
      return (
        <div data-studio-comments-state="off">
          <ChannelMessage state="off" title="Comments aren't on yet">
            Comments are switched off right now. Check back soon.
          </ChannelMessage>
        </div>
      );
    case "no-db":
      return (
        <div data-studio-comments-state="no-db">
          <ChannelMessage state="no-db" title="database not connected">
            Add the publishable key to <code>.env.local</code> (see <code>.env.example</code>) and restart to see the
            comments on your videos.
          </ChannelMessage>
        </div>
      );
    case "signed-out":
      return null;
    case "not-set-up":
      return (
        <div data-studio-comments-state="not-set-up">
          <ChannelMessage state="not-set-up" title="Comments aren't set up yet">
            Run <code>supabase/migrations/012_comments.sql</code> in the Supabase SQL editor, then reload.
          </ChannelMessage>
        </div>
      );
    case "ready":
      return (
        <div data-studio-comments-state="ready">
          <StudioComments comments={state.comments} channelDefault={state.channelDefault} now={state.now} />
        </div>
      );
  }
}

function StudioCommentsPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-[24px] font-normal leading-8 text-text">Channel comments</h1>
        <p className="mt-1 text-[14px] text-text-2">The latest 50 comments on your videos. More tools come with the creator studio.</p>
      </div>
      <Suspense fallback={<div className="h-40 rounded-sm bg-skeleton" aria-hidden />}>
        <CommentsGate />
      </Suspense>
    </div>
  );
}

const loadComments = createServerFn({ method: "GET" }).handler(async () => {
  const { studioComments } = await import("@/lib/comments/server");
  return studioComments();
});


export const Route = createFileRoute("/studio/comments")({

  loader: async () => {
    const state = await loadComments();
    if (state.kind === "signed-out") throw routeRedirect({ href: `/login?next=/studio/comments` });
    return state;
  },
  head: () => metadataToHead(metadata),
  component: StudioCommentsPage,
});

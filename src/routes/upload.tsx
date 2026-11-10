// Ported page: the original app's /upload.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { Uploader } from "@/components/upload/Uploader";
import { UploadSkeleton, UploadsOff } from "@/components/upload/UploadNotices";
import type { uploadPageState } from "@/lib/upload/server";

const metadata = { title: "Upload videos | sloptube" };

function UploadGate() {
  const state = Route.useLoaderData();
  switch (state.kind) {
    case "preview":
      return <Uploader configured={false} preview />;
    case "off":
      return <UploadsOff noDb={state.noDb} />;
    case "ready":
      return <Uploader configured={state.configured} />;
  }
}

function UploadPage() {
  return (
    <Suspense fallback={<UploadSkeleton />}>
      <UploadGate />
    </Suspense>
  );
}

const loadUpload = createServerFn({ method: "GET" }).handler(async () => {
  const { uploadPageState } = await import("@/lib/upload/server");
  return uploadPageState();
});


export const Route = createFileRoute("/upload")({
  ssr: false,
  loader: async () => {
    const state = await loadUpload();
    if (state.kind === "signed-out") throw routeRedirect({ href: "/login?next=/upload" });
    if (state.kind === "not-onboarded") throw routeRedirect({ href: "/welcome?next=/upload" });
    return state;
  },
  head: () => metadataToHead(metadata),
  component: UploadPage,
});

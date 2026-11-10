// Ported page: the original app's /studio/.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import Link from "next/link";
import { Suspense } from "react";
import { Dashboard } from "@/components/studio/Dashboard";
import {
  PreviewNotice,
  StudioHeader,
  StudioNoDb,
  StudioNotSetUp,
  StudioOff,
  StudioPage,
  StudioSkeleton,
} from "@/components/studio/StudioNotices";
import type { studioOverview } from "@/lib/studio/server";

const metadata = { title: "Channel dashboard | sloptube" };

function DashboardGate() {
  const state = Route.useLoaderData();
  switch (state.kind) {
    case "off":
      return <StudioOff />;
    case "no-db":
      return <StudioNoDb />;
    case "not-set-up":
      return <StudioNotSetUp />;
    case "signed-out":
      return null;
    case "ready":
      return (
        <StudioPage wide>
          <div data-studio-state="ready">
            {state.preview && <PreviewNotice />}
            <StudioHeader title="Channel dashboard">
              <Link href="/upload" className="btn-blue">
                Upload videos
              </Link>
            </StudioHeader>
            <Dashboard overview={state.overview} />
          </div>
        </StudioPage>
      );
  }
}

function StudioDashboardPage() {
  return (
    <Suspense
      fallback={
        <StudioPage wide>
          <StudioSkeleton />
        </StudioPage>
      }
    >
      <DashboardGate />
    </Suspense>
  );
}

const loadDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const { studioOverview } = await import("@/lib/studio/server");
  return studioOverview();
});


export const Route = createFileRoute("/studio/")({

  loader: async () => {
    const state = await loadDashboard();
    if (state.kind === "signed-out") throw routeRedirect({ href: `/login?next=/studio` });
    return state;
  },
  head: () => metadataToHead(metadata),
  component: StudioDashboardPage,
});

// Ported page: the original app's /studio/calendar.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { CalendarView } from "@/components/studio/CalendarView";
import { StudioPage, StudioSkeleton } from "@/components/studio/StudioNotices";

const metadata = { title: "Content calendar | sloptube" };

function StudioCalendarPage() {
  return (
    <Suspense
      fallback={
        <StudioPage wide>
          <StudioSkeleton />
        </StudioPage>
      }
    >
      <StudioPage wide>
        <CalendarView />
      </StudioPage>
    </Suspense>
  );
}



export const Route = createFileRoute("/studio/calendar")({

  loader: () => null,
  head: () => metadataToHead(metadata),
  component: StudioCalendarPage,
});

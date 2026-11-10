import Link from "next/link";
import { Suspense } from "react";
import type { studioContent } from "@/lib/studio/server";
import { ContentView } from "./ContentView";
import { PreviewNotice, StudioHeader, StudioNoDb, StudioNotSetUp, StudioOff, StudioPage } from "./StudioNotices";

export type ContentData = { state: Awaited<ReturnType<typeof studioContent>>; stats: boolean };

function ContentGate({ trash, data }: { trash: boolean; data: ContentData }) {
  const { state, stats } = data;
  switch (state.kind) {
    case "off":
      return <StudioOff />;
    case "no-db":
      return <StudioNoDb />;
    case "not-set-up":
      return <StudioNotSetUp />;
    case "signed-out":
      // The route's loader sends signed out people to /login first.
      return null;
    case "ready":
      return (
        <StudioPage wide>
          <div data-studio-state="ready">
            {state.preview && <PreviewNotice />}
            <StudioHeader title="Channel content">
              <Link href="/upload" className="btn-blue">
                Upload videos
              </Link>
            </StudioHeader>
            {/* useSearchParams in ContentView needs its own boundary. */}
            <Suspense fallback={<ContentSkeleton />}>
              <ContentView rows={state.rows} trash={trash} now={state.now} preview={state.preview} statsOn={stats} />
            </Suspense>
          </div>
        </StudioPage>
      );
  }
}

function ContentSkeleton() {
  return (
    <div aria-hidden className="space-y-3">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-[84px] rounded-[2px] bg-skeleton" />
      ))}
    </div>
  );
}

/** /studio/content and /studio/content/trash. */
export function ContentPage({ trash, data }: { trash: boolean; data: ContentData }) {
  return (
    <Suspense
      fallback={
        <StudioPage wide>
          <ContentSkeleton />
        </StudioPage>
      }
    >
      <ContentGate trash={trash} data={data} />
    </Suspense>
  );
}

// Ported page: the original app's /studio/settings.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { StudioHeader, StudioOff, StudioPage } from "@/components/studio/StudioNotices";
import { YapinAnnouncements } from "@/components/studio/YapinAnnouncements";
import type { studioOn } from "@/lib/studio/server";
import { yapinErrorText } from "@/lib/yapin/rules";
import type { announcements, yapinOn } from "@/lib/yapin/server";

const metadata = { title: "Settings | sloptube" };

function SettingsGate() {
  const { on } = Route.useLoaderData();
  if (!on) return <StudioOff />;
  return (
    <StudioPage>
      <div data-studio-state="settings">
        <StudioHeader title="Settings" />
        <Suspense fallback={null}>
          <Announcements />
        </Suspense>
        <div className="rounded-[2px] bg-surface px-6 py-12 text-center shadow-[0_0_0_1px_var(--divider)]">
          <p className="text-[16px] text-text">Channel settings arrive in a later feature</p>
          <p className="mt-2 text-[14px] text-text-2">
            Upload defaults, permissions and more will live here. The default comments setting is in Comments for now.
          </p>
        </div>
      </div>
    </StudioPage>
  );
}

/** Yapin' announcements, with the yapin flag on (feature 16). */
function Announcements() {
  const { yapin, state } = Route.useLoaderData();
  if (!yapin || !state) return null;
  if ("error" in state) {
    return (
      <p data-yapin-announcements="error" className="mb-4 rounded-[2px] bg-surface px-6 py-4 text-[14px] text-text-2 shadow-[0_0_0_1px_var(--divider)]">
        Yapin&apos; announcements: {yapinErrorText(state.error)}
      </p>
    );
  }
  return (
    <div className="mb-4">
      <YapinAnnouncements initial={state} />
    </div>
  );
}

function StudioSettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsGate />
    </Suspense>
  );
}

const loadStudioSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { studioOn } = await import("@/lib/studio/server");
  const { announcements, yapinOn } = await import("@/lib/yapin/server");
  const on = await studioOn();
  const yapin = on && (await yapinOn());
  return { on, yapin, state: yapin ? await announcements() : null };
});


export const Route = createFileRoute("/studio/settings")({

  loader: () => loadStudioSettings(),
  head: () => metadataToHead(metadata),
  component: StudioSettingsPage,
});

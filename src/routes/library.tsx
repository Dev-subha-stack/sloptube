// Ported page: the original app's /library.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { SharedWithYou } from "@/components/share/SharedWithYou";

const metadata = { title: "Library | sloptube" };

function Library() {
  const [shared, setShared] = useState(0);
  return (
    <>
      <SharedWithYou onCount={setShared} />
      {shared === 0 && <EmptyState
        title="Your library is empty."
        hint="Videos you watch show up in History, and the channels you follow in Subscriptions."
        cards={0}
      />}
    </>
  );
}



export const Route = createFileRoute("/library")({

  loader: () => null,
  head: () => metadataToHead(metadata),
  component: Library,
});

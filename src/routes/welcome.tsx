// Ported page: the original app's /welcome.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { AuthCard, DbNotConnected, FeatureOff, FormSkeleton } from "@/components/auth/AuthCard";
import { WelcomeForm } from "@/components/auth/WelcomeForm";
import { safeNext } from "@/lib/accounts/redirect";
import type { accountsState } from "@/lib/accounts/server";

const metadata = { title: "Finish signing up | sloptube" };

function WelcomeGate() {
  const next = safeNext(Route.useSearch().next);
  const state = Route.useLoaderData();
  if (state.kind === "no-db") return <DbNotConnected />;
  if (state.kind === "off") return <FeatureOff />;
  if (!state.user || state.user.onboarded) return null;
  return <WelcomeForm suggested={state.user.username} next={next} />;
}

function WelcomePage() {
  return (
    <AuthCard title="One more step" subtitle="Pick your username and tell us your birthday">
      <Suspense fallback={<FormSkeleton />}>
        <WelcomeGate />
      </Suspense>
    </AuthCard>
  );
}

const loadWelcome = createServerFn({ method: "GET" }).handler(async () => {
  const { accountsState } = await import("@/lib/accounts/server");
  return accountsState();
});


export const Route = createFileRoute("/welcome")({
  validateSearch: (s: Record<string, unknown>) => s as Record<string, string | undefined>,
  loaderDeps: ({ search }) => ({ search }),
  ssr: false,
  loader: async ({ deps }) => {
    const state = await loadWelcome();
    if (state.kind === "ready" && !state.user) throw routeRedirect({ href: "/login?next=/welcome" });
    if (state.kind === "ready" && state.user?.onboarded) throw routeRedirect({ href: safeNext(deps.search.next) });
    return state;
  },
  head: () => metadataToHead(metadata),
  component: WelcomePage,
});

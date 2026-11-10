// Ported page: the original app's /signup.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { AuthCard, DbNotConnected, FeatureOff, FormSkeleton } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";
import { safeNext } from "@/lib/accounts/redirect";
import type { accountsState } from "@/lib/accounts/server";
import type { yapinSignIn } from "@/lib/yapin/server";

const metadata = { title: "Create your account | sloptube" };

function SignupGate() {
  const next = safeNext(Route.useSearch().next);
  const { state, yapin } = Route.useLoaderData();
  if (state.kind === "no-db") return <DbNotConnected />;
  if (state.kind === "off") return <FeatureOff />;
  if (state.user) return null;
  return <SignupForm next={next} yapin={yapin} />;
}

function SignupPage() {
  return (
    <AuthCard title="Create your account" subtitle="to continue to sloptube">
      <Suspense fallback={<FormSkeleton />}>
        <SignupGate />
      </Suspense>
    </AuthCard>
  );
}

const loadAccounts = createServerFn({ method: "GET" }).handler(async () => {
  const { accountsState } = await import("@/lib/accounts/server");
  const { yapinSignIn } = await import("@/lib/yapin/server");
  const [state, yapin] = await Promise.all([accountsState(), yapinSignIn(null)]);
  return { state, yapin: yapin !== null };
});


export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>) => s as Record<string, string | undefined>,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps }) => {
    const r = await loadAccounts();
    if (r.state.kind === "ready" && r.state.user) {
      const next = safeNext(deps.search.next);
      throw routeRedirect({ href: r.state.user.onboarded ? next : "/welcome" });
    }
    return r;
  },
  head: () => metadataToHead(metadata),
  component: SignupPage,
});

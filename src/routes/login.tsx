// Ported page: the original app's /login.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { Suspense } from "react";
import { AuthCard, DbNotConnected, FeatureOff, FormSkeleton } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { SavedAccounts } from "@/components/auth/SavedAccounts";
import { safeNext } from "@/lib/accounts/redirect";
import type { accountsState } from "@/lib/accounts/server";
import { yapinNote } from "@/lib/yapin/rules";
import type { yapinSignIn } from "@/lib/yapin/server";

const metadata = { title: "Sign in | sloptube" };

const callbackError = "Sign in did not finish. Try again.";
/** proxy.ts sends a banned account here once it has signed it out (feature 14). */
const bannedError = "This account has been banned for breaking the rules.";

function LoginGate() {
  const params = Route.useSearch();
  const next = safeNext(params.next);
  const { state, yapin } = Route.useLoaderData();
  if (state.kind === "no-db") return <DbNotConnected />;
  if (state.kind === "off") return <FeatureOff />;
  if (state.user) return null;
  const note = typeof params.yapin === "string" ? yapinNote(params.yapin) : null;
  return (
    <>
    <SavedAccounts />
    <LoginForm
      next={next}
      yapin={yapin}
      initialError={params.banned ? bannedError : params.error ? callbackError : note}
    />
    </>
  );
}

function LoginPage() {
  return (
    <AuthCard title={Route.useSearch().add ? "Add an account" : "Sign in"} subtitle="to continue to sloptube">
      <Suspense fallback={<FormSkeleton />}>
        <LoginGate />
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


export const Route = createFileRoute("/login")({
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
  component: LoginPage,
});

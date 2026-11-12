import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { Suspense, useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { installAuthFetch } from "@/lib/auth-fetch";
import { maintenanceOpen } from "@/lib/launch/maintenance";
import { SessionContext, sessionStoreFor } from "@/lib/store/session";
import { themeScript } from "@/lib/theme";
import { appearanceScript } from "@/lib/appearance";
import { getSessionState } from "@/functions/session.functions";
import { Guide } from "@/components/Guide";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { FlagPanel } from "@/components/flags/FlagPanel";
import { SiteFooter } from "@/components/launch/SiteFooter";
import { PathTracker } from "@/components/PathTracker";
import { TopBar } from "@/components/TopBar";
import { Logo } from "@/components/Logo";
import { ErrorPage } from "@/components/launch/ErrorPage";

function NotFoundComponent() {
  return (
    <ErrorPage state="404" title="This page isn't available. Sorry about that.">
      Try searching for something else.
    </ErrorPage>
  );
}

/** Anything that throws while a page renders: the 2019 500 page with Try again. */
function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <ErrorPage
      state="500"
      title="Something went wrong."
      search={false}
      actions={
        <button
          type="button"
          onClick={() => {
            void router.invalidate();
            reset();
          }}
          className="btn-text"
        >
          Try again
        </button>
      }
    >
      Sorry about that. Try again in a moment.
    </ErrorPage>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Only reloaded when the session changes (router.invalidate()).
  staleTime: Infinity,
  loader: async () => ({ session: await getSessionState() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "sloptube" },
      { name: "description", content: "A video platform, built in the open one feature at a time." },
      { name: "theme-color", content: "#ffffff", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#202020", media: "(prefers-color-scheme: dark)" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
    scripts: [{ children: themeScript }, { children: appearanceScript }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script may add the "dark" class before React hydrates.
    <html lang="en" className="h-full antialiased" style={{ ["--font-roboto" as string]: "Roboto" }} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-full pt-14">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** Keeps the page in step with the browser's session: reloads data on sign in/out. */
function useSessionSync(signedInOnServer: boolean, banned: boolean) {
  const router = useRouter();
  useEffect(() => {
    installAuthFetch();
    // The server rendered for a signed out visitor; with a stored session, load again as them.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session && !signedInOnServer) void router.invalidate();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!banned) return;
    void supabase.auth.signOut({ scope: "local" }).then(() => {
      window.location.assign("/login?banned=1");
    });
  }, [banned]);
}

function Maintenance() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center" data-maintenance>
      <Logo />
      <p className="mt-6 text-[18px] text-text">We&apos;re doing some maintenance.</p>
      <p className="mt-1 text-[14px] text-text-2">Check back in a few minutes.</p>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { session } = Route.useLoaderData();
  const pathname = useLocation({ select: (l) => l.pathname });
  const [store] = useState(() => sessionStoreFor({ config: session.config, user: session.user, flags: session.flags }));
  useEffect(() => {
    store.getState().setSession({ config: session.config, user: session.user, flags: session.flags });
  }, [store, session]);
  useSessionSync(session.user !== null, session.banned);

  const embed = pathname.startsWith("/embed/");
  const down = session.maintenance && !maintenanceOpen(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionContext.Provider value={store}>
        {embed ? (
          <Outlet />
        ) : (
          <>
            <a href="#content" className="skip-link">
              Skip to content
            </a>
            <TopBar />
            <Suspense fallback={null}>
              <OnboardingGuard />
            </Suspense>
            <Suspense fallback={null}>
              <PathTracker />
            </Suspense>
            {session.flagPanel && <FlagPanel initial={session.flagPanel} />}
            <div className="flex">
              <Guide />
              <div className="flex min-w-0 flex-1 flex-col">
                <main id="content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
                  {down ? <Maintenance /> : <Outlet />}
                </main>
                <SiteFooter />
              </div>
            </div>
          </>
        )}
      </SessionContext.Provider>
    </QueryClientProvider>
  );
}

// Stand-in for the old framework's navigation helpers, built on TanStack Router.
// The ported components keep calling useRouter()/usePathname()/useSearchParams().
import { notFound as tsNotFound, redirect as tsRedirect, useLocation, useRouter as useTsRouter } from "@tanstack/react-router";
import { useMemo } from "react";

export type AppRouter = {
  push: (href: string, opts?: { scroll?: boolean }) => void;
  replace: (href: string, opts?: { scroll?: boolean }) => void;
  refresh: () => void;
  back: () => void;
  forward: () => void;
  prefetch: (href: string) => void;
};

export function useRouter(): AppRouter {
  const router = useTsRouter();
  return useMemo<AppRouter>(
    () => ({
      push: (href, opts) => {
        void router.navigate({ href, resetScroll: opts?.scroll !== false });
      },
      replace: (href, opts) => {
        void router.navigate({ href, replace: true, resetScroll: opts?.scroll !== false });
      },
      refresh: () => {
        void router.invalidate();
      },
      back: () => router.history.back(),
      forward: () => router.history.forward(),
      prefetch: (href) => {
        void router.preloadRoute({ href } as never).catch(() => {});
      },
    }),
    [router],
  );
}

export function usePathname(): string {
  return useLocation({ select: (l) => l.pathname });
}

export function useSearchParams(): URLSearchParams {
  const searchStr = useLocation({ select: (l) => l.searchStr });
  return useMemo(() => new URLSearchParams(searchStr), [searchStr]);
}

/** Throws a redirect. Only valid inside loaders, beforeLoad and server functions. */
export function redirect(href: string): never {
  throw tsRedirect({ href });
}

export function permanentRedirect(href: string): never {
  throw tsRedirect({ href, statusCode: 308 });
}

export function notFound(): never {
  throw tsNotFound();
}

import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Channel pages live at /c/<handle>; people and links use /@<handle>, as on the original site.
const AT = /^\/@([^/]+)(\/(?:videos|shorts|playlists|about))?\/?$/;

export const getRouter = () => {
  // One client per request: a module-level QueryClient leaks cached data between SSR requests.
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    rewrite: {
      input: ({ url }) => {
        const m = AT.exec(url.pathname);
        if (m) url.pathname = `/c/${m[1]}${m[2] ?? ""}`;
        return url;
      },
      // The preview server keeps /@ addresses for itself, so there the address bar shows /c/<handle>.
      output: ({ url }) => {
        if (!import.meta.env.DEV) return url;
        const m = AT.exec(url.pathname);
        if (m) url.pathname = `/c/${m[1]}${m[2] ?? ""}`;
        return url;
      },
    },
    // Lets Query own freshness; set caching defaults on the QueryClient, not the router.
    defaultPreloadStaleTime: 0,
  });

  return router;
};

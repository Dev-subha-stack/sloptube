// Server route: the original app's /api/search/suggest handler, unchanged in src/handlers/api/search/suggest/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/search/suggest/route";

export const Route = createFileRoute("/api/search/suggest")({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.GET, request, Promise.resolve({})),
    },
  },
});

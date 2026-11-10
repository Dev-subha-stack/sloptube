// Server route: the original app's /api/studio/analytics handler, unchanged in src/handlers/api/studio/analytics/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/studio/analytics/route";

export const Route = createFileRoute("/api/studio/analytics")({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.GET, request, Promise.resolve({})),
    },
  },
});

// Server route: the original app's /api/studio/analytics/realtime handler, unchanged in src/handlers/api/studio/analytics/realtime/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/studio/analytics/realtime/route";

export const Route = createFileRoute("/api/studio/analytics/realtime")({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.GET, request, Promise.resolve({})),
    },
  },
});

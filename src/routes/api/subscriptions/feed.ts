// Server route: the original app's /api/subscriptions/feed handler, unchanged in src/handlers/api/subscriptions/feed/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/subscriptions/feed/route";

export const Route = createFileRoute("/api/subscriptions/feed")({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.GET, request, Promise.resolve({})),
    },
  },
});

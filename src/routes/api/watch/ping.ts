// Server route: the original app's /api/watch/ping handler, unchanged in src/handlers/api/watch/ping/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/watch/ping/route";

export const Route = createFileRoute("/api/watch/ping")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

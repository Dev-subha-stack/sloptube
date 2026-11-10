// Server route: the original app's /api/videos/$id/status handler, unchanged in src/handlers/api/videos/_id/status/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/videos/_id/status/route";

export const Route = createFileRoute("/api/videos/$id/status")({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.GET, request, Promise.resolve({ id: params.id })),
    },
  },
});

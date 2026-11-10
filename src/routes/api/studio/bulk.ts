// Server route: the original app's /api/studio/bulk handler, unchanged in src/handlers/api/studio/bulk/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/studio/bulk/route";

export const Route = createFileRoute("/api/studio/bulk")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

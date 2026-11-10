// Server route: the original app's /api/moderation/report handler, unchanged in src/handlers/api/moderation/report/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/moderation/report/route";

export const Route = createFileRoute("/api/moderation/report")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

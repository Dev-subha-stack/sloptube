// Server route: the original app's /api/moderation/appeal handler, unchanged in src/handlers/api/moderation/appeal/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/moderation/appeal/route";

export const Route = createFileRoute("/api/moderation/appeal")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

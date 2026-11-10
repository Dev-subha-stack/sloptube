// Server route: the original app's /api/shorts/comments handler, unchanged in src/handlers/api/shorts/comments/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/shorts/comments/route";

export const Route = createFileRoute("/api/shorts/comments")({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.GET, request, Promise.resolve({})),
    },
  },
});

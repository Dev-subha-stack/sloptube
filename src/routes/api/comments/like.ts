// Server route: the original app's /api/comments/like handler, unchanged in src/handlers/api/comments/like/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/comments/like/route";

export const Route = createFileRoute("/api/comments/like")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

// Server route: the original app's /api/comments/moderate handler, unchanged in src/handlers/api/comments/moderate/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/comments/moderate/route";

export const Route = createFileRoute("/api/comments/moderate")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

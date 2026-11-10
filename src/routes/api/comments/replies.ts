// Server route: the original app's /api/comments/replies handler, unchanged in src/handlers/api/comments/replies/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/comments/replies/route";

export const Route = createFileRoute("/api/comments/replies")({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.GET, request, Promise.resolve({})),
    },
  },
});

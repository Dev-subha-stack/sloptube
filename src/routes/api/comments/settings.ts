// Server route: the original app's /api/comments/settings handler, unchanged in src/handlers/api/comments/settings/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/comments/settings/route";

export const Route = createFileRoute("/api/comments/settings")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

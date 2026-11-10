// Server route: the original app's /api/history/progress handler, unchanged in src/handlers/api/history/progress/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/history/progress/route";

export const Route = createFileRoute("/api/history/progress")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

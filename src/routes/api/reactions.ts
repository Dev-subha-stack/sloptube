// Server route: the original app's /api/reactions handler, unchanged in src/handlers/api/reactions/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/reactions/route";

export const Route = createFileRoute("/api/reactions")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

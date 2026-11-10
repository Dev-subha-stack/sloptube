// Server route: the original app's /api/history handler, unchanged in src/handlers/api/history/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/history/route";

export const Route = createFileRoute("/api/history")({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.GET, request, Promise.resolve({})),
      DELETE: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.DELETE, request, Promise.resolve({})),
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

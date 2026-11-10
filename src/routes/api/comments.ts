// Server route: the original app's /api/comments handler, unchanged in src/handlers/api/comments/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/comments/route";

export const Route = createFileRoute("/api/comments")({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.GET, request, Promise.resolve({})),
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
      PATCH: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.PATCH, request, Promise.resolve({})),
      DELETE: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.DELETE, request, Promise.resolve({})),
    },
  },
});

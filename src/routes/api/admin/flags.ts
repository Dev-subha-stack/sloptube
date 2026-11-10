// Server route: the original app's /api/admin/flags handler, unchanged in src/handlers/api/admin/flags/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/admin/flags/route";

export const Route = createFileRoute("/api/admin/flags")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

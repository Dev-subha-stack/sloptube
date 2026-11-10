// Server route: the original app's /api/admin/action handler, unchanged in src/handlers/api/admin/action/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/admin/action/route";

export const Route = createFileRoute("/api/admin/action")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

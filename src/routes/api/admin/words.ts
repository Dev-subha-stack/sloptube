// Server route: the original app's /api/admin/words handler, unchanged in src/handlers/api/admin/words/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/admin/words/route";

export const Route = createFileRoute("/api/admin/words")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

// Server route: the original app's /api/shorts/choice handler, unchanged in src/handlers/api/shorts/choice/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/shorts/choice/route";

export const Route = createFileRoute("/api/shorts/choice")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

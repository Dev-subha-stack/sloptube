// Server route: the original app's /api/studio/thumbnail/sign handler, unchanged in src/handlers/api/studio/thumbnail/sign/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/studio/thumbnail/sign/route";

export const Route = createFileRoute("/api/studio/thumbnail/sign")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

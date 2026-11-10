// Server route: the original app's /api/upload/abort handler, unchanged in src/handlers/api/upload/abort/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/upload/abort/route";

export const Route = createFileRoute("/api/upload/abort")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

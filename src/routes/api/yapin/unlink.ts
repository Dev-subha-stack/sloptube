// Server route: the original app's /api/yapin/unlink handler, unchanged in src/handlers/api/yapin/unlink/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/yapin/unlink/route";

export const Route = createFileRoute("/api/yapin/unlink")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

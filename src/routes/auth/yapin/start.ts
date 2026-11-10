// Server route: the original app's /auth/yapin/start handler, unchanged in src/handlers/auth/yapin/start/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/auth/yapin/start/route";

export const Route = createFileRoute("/auth/yapin/start")({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.GET, request, Promise.resolve({})),
    },
  },
});

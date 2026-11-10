// Server route: the original app's /auth/yapin handler, unchanged in src/handlers/auth/yapin/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/auth/yapin/route";

export const Route = createFileRoute("/auth/yapin")({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.GET, request, Promise.resolve({})),
    },
  },
});

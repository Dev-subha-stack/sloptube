// Server route: the original app's /api/upload/sign handler, unchanged in src/handlers/api/upload/sign/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/upload/sign/route";

export const Route = createFileRoute("/api/upload/sign")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

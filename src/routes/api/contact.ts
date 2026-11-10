// Server route: the original app's /api/contact handler, unchanged in src/handlers/api/contact/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/contact/route";

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

// Server route: direct-message moderation report endpoint.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/moderation/report-dm/route";

export const Route = createFileRoute("/api/moderation/report-dm")({
  server: {
    handlers: {
      POST: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.POST, request, Promise.resolve({})),
    },
  },
});

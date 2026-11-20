// Server route for authorized original video downloads.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/videos/_id/download/route";

export const Route = createFileRoute("/api/videos/$id/download")({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: Record<string, string> }) =>
        callHandler(h.GET, request, Promise.resolve({ id: params.id })),
    },
  },
});

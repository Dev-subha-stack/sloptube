// Server route: the original app's /api/media/$video/$ handler, unchanged in src/handlers/api/media/_video/_path/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/api/media/_video/_path/route";

export const Route = createFileRoute("/api/media/$video/$")({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.GET, request, Promise.resolve({ video: params.video, path: params._splat ? String(params._splat).split("/") : [] })),
    },
  },
});

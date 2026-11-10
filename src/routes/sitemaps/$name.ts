// Server route: the original app's /sitemaps/$name handler, unchanged in src/handlers/sitemaps/_name/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/sitemaps/_name/route";

export const Route = createFileRoute("/sitemaps/$name")({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.GET, request, Promise.resolve({ name: params.name })),
    },
  },
});

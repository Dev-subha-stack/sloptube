// Server route: the original app's /robots.txt handler, unchanged in src/handlers/robots.txt/route.ts.
import { createFileRoute } from "@tanstack/react-router";
import { callHandler } from "next/server";
import * as h from "@/handlers/robots.txt/route";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request, params }: { request: Request; params: Record<string, string> }) => callHandler(h.GET, request, Promise.resolve({})),
    },
  },
});

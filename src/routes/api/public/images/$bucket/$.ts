// Public image address for profile pictures and channel banners. The files sit in
// private storage; this serves only those folders' images (and channel emojis), read only.
import { createFileRoute } from "@tanstack/react-router";

const BUCKETS = new Set(["avatars", "banners", "emojis", "posts"]);
const PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/\d{1,16}\.(png|webp|jpg|jpeg|gif)$/;
const TYPES: Record<string, string> = {
  png: "image/png",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
};

export const Route = createFileRoute("/api/public/images/$bucket/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const bucket = params.bucket;
        const path = String((params as { _splat?: string })._splat ?? "");
        const m = PATH.exec(path);
        const ext = m?.[1];
        if (!BUCKETS.has(bucket) || !ext) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);
        if (error || !data) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
        return new Response(data, {
          headers: {
            "Content-Type": TYPES[ext] ?? "application/octet-stream",
            // File names change on every upload, so a stored copy never goes stale.
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});

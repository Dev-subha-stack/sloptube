// The upload content filter: the uploader's browser sends a few stills from the
// video it is about to upload. Explicit content removes the video and bans the
// account. Signed in only, and only for the caller's own video.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  videoId: z.string().uuid(),
  frames: z
    .array(z.string().max(400_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/))
    .min(1)
    .max(6),
});

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/moderation/scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        if (!supabase) return json({ error: "no_db" }, 503);
        const { data: auth } = await supabase.auth.getUser();
        const me = auth.user?.id;
        if (!me) return json({ error: "not_signed_in" }, 401);

        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "bad_request" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: video } = await supabaseAdmin
          .from("videos")
          .select("id, owner_id")
          .eq("id", parsed.data.videoId)
          .maybeSingle();
        if (!video || video.owner_id !== me) return json({ error: "not_found" }, 404);

        const { classifyFrames, shouldBlock, removeAndBan } = await import("@/lib/nsfw/server");
        const verdict = await classifyFrames(parsed.data.frames);
        if (!shouldBlock(verdict)) return json({ blocked: false });
        const done = await removeAndBan(video.id, verdict!.reason);
        return json({ blocked: done });
      },
    },
  },
});

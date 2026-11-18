// POST /api/admin/videos/delete { videoId } — staff with the "manage videos" power delete a video for good:
// its files in storage, then the video and everything hanging off it (comments, likes, stats).
import { createFileRoute } from "@tanstack/react-router";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => Response.json({ error }, { status, headers: noStore });

export const Route = createFileRoute("/api/admin/videos/delete")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json().catch(() => null)) as { videoId?: unknown } | null;
        const id = typeof body?.videoId === "string" && UUID.test(body.videoId) ? body.videoId.toLowerCase() : null;
        if (!id) return fail("bad_request", 400);

        // Who is asking: their own session, checked by the database.
        const { createClient } = await import("@/lib/supabase/server");
        const db = await createClient();
        if (!db) return fail("no_db", 503);
        const { data: allowed } = await db.rpc("has_permission", { perm: "manage_videos" });
        if (allowed !== true) return fail("not_allowed", 403);
        const { data: me } = await db.auth.getUser();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: video } = await supabaseAdmin.from("videos").select("id, title, hls_key, source_key").eq("id", id).maybeSingle();
        if (!video) return fail("not_found", 404);

        // Built-in storage: everything for a video sits in one folder next to its source file.
        for (const key of [video.hls_key, video.source_key]) {
          if (!key || !key.startsWith("uploads/")) continue;
          const folder = key.slice(0, key.lastIndexOf("/"));
          const store = supabaseAdmin.storage.from("videos");
          const { data: files } = await store.list(folder, { limit: 1000 });
          const paths = (files ?? []).map((f) => `${folder}/${f.name}`);
          if (paths.length) await store.remove(paths);
        }
        // Files kept elsewhere (R2) go to the cleanup queue the encoder worker empties.
        if (video.hls_key && !video.hls_key.startsWith("uploads/")) {
          await supabaseAdmin.from("storage_cleanup").insert({ video_id: id, prefix: `hls/${id}/` });
        }

        const { error } = await supabaseAdmin.from("videos").delete().eq("id", id);
        if (error) return fail("delete_failed", 500);
        await supabaseAdmin.from("mod_log").insert({
          actor_id: me.user?.id ?? null,
          action: "delete_video",
          target_kind: "video",
          target_id: id,
          target_label: video.title,
          reason: "Deleted for good by staff",
        });
        return Response.json({ deleted: true }, { headers: noStore });
      },
    },
  },
});

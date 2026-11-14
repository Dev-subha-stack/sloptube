import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { flagOn } from "@/lib/flags";
import { createClient } from "@/lib/supabase/server";
import { createUploadDb } from "./db";
import { readR2Config } from "./env";
import type { HandlerResult, UploadContext } from "./handlers";
import { createR2Client, createR2Storage } from "./r2";
import { createCloudUploadStorage, publishCloudVideo, saveCloudThumbnail } from "./cloud";

const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= max ? v : 0);

/** Built-in storage: save the poster frame, check it with the content filter, then publish. */
async function publishAfterUpload(video: { id: string; sourceKey: string }, body: Record<string, unknown>): Promise<string | null> {
  const thumb = typeof body.thumbnail === "string" ? body.thumbnail : null;
  if (thumb) {
    await saveCloudThumbnail(video.sourceKey, thumb).catch(() => false);
    const { classifyFrames, shouldBlock, removeAndBan } = await import("@/lib/nsfw/server");
    const verdict = await classifyFrames([thumb]).catch(() => null);
    if (shouldBlock(verdict)) {
      await removeAndBan(video.id, verdict!.reason);
      return "banned";
    }
  }
  const err = await publishCloudVideo(video.id, {
    durationS: num(body.durationS, 24 * 3600),
    width: num(body.width, 10000),
    height: num(body.height, 10000),
  });
  return err ? "publish_failed" : null;
}

/** The real R2 storage, Supabase and session for the upload routes. */
export async function uploadContext(): Promise<UploadContext> {
  const r2 = readR2Config();
  const supabase = await createClient();
  return {
    // Without the R2 settings, videos live in the built-in storage and are published straight away.
    storage: r2 ? createR2Storage(createR2Client(r2), r2.bucket) : createCloudUploadStorage(),
    afterUpload: r2 ? undefined : publishAfterUpload,
    db: supabase ? createUploadDb(supabase) : null,
    userId: async () => (await getCurrentUser())?.id ?? null,
    flagOn: (userId) => flagOn("upload", userId),
  };
}

/** Reads the JSON body, runs the handler and answers. Never cached. */
export async function runUploadRoute(
  request: Request,
  handler: (body: unknown, ctx: UploadContext) => Promise<HandlerResult>,
): Promise<Response> {
  const body = await request.json().catch(() => null);
  const result = await handler(body, await uploadContext());
  return Response.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}

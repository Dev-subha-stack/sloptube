import { createClient } from "@/lib/supabase/server";
import { flagOn } from "@/lib/flags";
import { readR2Config } from "@/lib/upload/env";
import { createR2Client } from "@/lib/upload/r2";
import { presign } from "@/lib/r2/s3";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOURCE_KEY = /^uploads\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/source\.(mp4|mov|webm|mkv)$/i;
const MIME_EXTENSIONS: Record<string, string[]> = {
  "video/mp4": ["mp4"],
  "video/quicktime": ["mov", "mp4"],
  "video/webm": ["webm"],
  "video/x-matroska": ["mkv"],
};

function fail(status: number, error: string) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function safeFilename(title: string, extension: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^[_ .]+|[_ .]+$/g, "")
    .slice(0, 80);
  return `${base || "sloptube-video"}.${extension.toLowerCase()}`;
}

/** Only ready videos visible to the caller can be downloaded. The source key is never sent to the client. */
export async function GET(_request: Request, ctx: RouteContext<"/api/videos/[id]/download">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return fail(404, "not_found");
  if (!(await flagOn("watch"))) return fail(403, "watch_off");

  const supabase = await createClient();
  if (!supabase) return fail(503, "no_db");

  const { data, error } = await supabase.rpc("video_download_source", { video_id: id.toLowerCase() });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") return fail(503, "download_not_set_up");
    return fail(404, "not_found");
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { source_key: string | null; source_mime: string | null; title: string | null }
    | null;
  if (!row?.source_key || !row.source_mime || !row.title) return fail(404, "not_found");

  const key = row.source_key;
  const keyMatch = SOURCE_KEY.exec(key);
  const allowedExtensions = MIME_EXTENSIONS[row.source_mime.toLowerCase()];
  const extension = keyMatch?.[1]?.toLowerCase();
  if (!keyMatch || !extension || !allowedExtensions?.includes(extension)) return fail(404, "not_found");

  const filename = safeFilename(row.title, extension);
  try {
    const r2 = readR2Config();
    const url = r2
      ? await presign(
          createR2Client(r2),
          "GET",
          r2.bucket,
          key,
          60 * 60,
          {
            "response-content-disposition": `attachment; filename="${filename}"`,
            "response-content-type": row.source_mime,
          },
        )
      : await (await import("@/lib/upload/cloud")).createCloudDownloadUrl(key, 60 * 60, filename);

    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return fail(502, "download_unavailable");
  }
}

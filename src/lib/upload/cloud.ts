import "server-only";
// Built-in video storage on Lovable Cloud, used whenever the R2 settings are
// not set. The browser-compressed file (50 MB at most) goes up in one signed
// PUT, and the server publishes it as is: no outside encoder needed.
import type { MediaStorage } from "@/lib/watch/media";
import type { UploadStorage } from "./handlers";

export const CLOUD_BUCKET = "videos";
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin.storage.from(CLOUD_BUCKET);
}

/** Signed links must point at the address the browser can reach. */
function browserUrl(url: string): string {
  const pub = (import.meta.env?.["VITE_SUPABASE_URL"] as string | undefined)?.trim();
  if (!pub) return url;
  try {
    const u = new URL(url);
    const p = new URL(pub);
    u.protocol = p.protocol;
    u.host = p.host;
    return u.toString();
  } catch {
    return url;
  }
}

function split(key: string): { folder: string; name: string } {
  const i = key.lastIndexOf("/");
  return { folder: key.slice(0, i), name: key.slice(i + 1) };
}

export function createCloudUploadStorage(): UploadStorage {
  return {
    singlePart: true,
    async createMultipart() {
      return "cloud";
    },
    async presignPart(key, _uploadId, partNumber) {
      if (partNumber !== 1) throw new Error("one part only");
      const { data, error } = await (await admin()).createSignedUploadUrl(key, { upsert: true });
      if (error || !data) throw new Error(error?.message ?? "sign failed");
      return browserUrl(data.signedUrl);
    },
    async completeMultipart() {
      // One PUT: nothing to join.
    },
    async abortMultipart(key) {
      await (await admin()).remove([key]);
    },
    async objectSize(key) {
      const { folder, name } = split(key);
      const { data } = await (await admin()).list(folder, { search: name, limit: 10 });
      const hit = data?.find((o) => o.name === name);
      const size = (hit?.metadata as { size?: number } | undefined)?.size;
      return typeof size === "number" ? size : null;
    },
  };
}

export function createCloudMediaStorage(): MediaStorage {
  return {
    async getText(key) {
      const { data } = await (await admin()).download(key);
      if (!data || data.size > MAX_TEXT_BYTES) return null;
      return data.text();
    },
    async presign(key, expiresIn) {
      const { data, error } = await (await admin()).createSignedUrl(key, expiresIn);
      if (error || !data) throw new Error(error?.message ?? "sign failed");
      return browserUrl(data.signedUrl);
    },
  };
}

/** Saves the poster frame the browser grabbed, next to the video, as thumb-1.webp (what /api/media serves). */
export async function saveCloudThumbnail(sourceKey: string, dataUrl: string): Promise<boolean> {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m || m[2]!.length > 2_000_000) return false;
  const bytes = Uint8Array.from(atob(m[2]!), (c) => c.charCodeAt(0));
  const { folder } = split(sourceKey);
  const { error } = await (await admin()).upload(`${folder}/thumb-1.webp`, bytes, { contentType: m[1], upsert: true });
  return !error;
}

/** Publishes an uploaded video straight away (service role). */
export async function publishCloudVideo(videoId: string, meta: { durationS: number; width: number; height: number }): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("direct_publish", {
    video_id: videoId,
    duration_s: meta.durationS,
    width: Math.round(meta.width),
    height: Math.round(meta.height),
  });
  return error ? error.message : null;
}

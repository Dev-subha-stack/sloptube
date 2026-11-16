import { deleteObject as r2Delete, head, presign } from "@/lib/r2/s3";
import { readR2Config } from "@/lib/upload/env";
import { createR2Client } from "@/lib/upload/r2";

/** How long a signed thumbnail link works in the studio, and how long an upload link does. */
const VIEW_TTL_S = 60 * 60;
const PUT_TTL_S = 10 * 60;

function r2() {
  const config = readR2Config();
  return config ? { client: createR2Client(config), bucket: config.bucket } : null;
}

/** Without R2 the files live in the built-in Cloud bucket (see lib/upload/cloud.ts). */
async function cloud() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { CLOUD_BUCKET } = await import("@/lib/upload/cloud");
  return supabaseAdmin.storage.from(CLOUD_BUCKET);
}

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

/** True when the thumbnails sit in R2 (hls/<id>/...), false for the built-in storage (next to the source file). */
export function usesR2(): boolean {
  return readR2Config() !== null;
}

/** Thumbnails can always be uploaded: R2 when set, else the built-in storage. */
export function storageConfigured(): boolean {
  return true;
}

/** A short lived GET link to one object. Null when it is not there. */
export async function signedGet(key: string): Promise<string | null> {
  const s = r2();
  try {
    if (s) return await presign(s.client, "GET", s.bucket, key, VIEW_TTL_S);
    const { data, error } = await (await cloud()).createSignedUrl(key, VIEW_TTL_S);
    return error || !data ? null : browserUrl(data.signedUrl);
  } catch {
    return null;
  }
}

/** A PUT link for a custom thumbnail. The browser must send this content type. */
export async function signedPut(key: string, mime: string): Promise<string | null> {
  const s = r2();
  if (s) return presign(s.client, "PUT", s.bucket, key, PUT_TTL_S, undefined, { "Content-Type": mime });
  const { data, error } = await (await cloud()).createSignedUploadUrl(key, { upsert: true });
  return error || !data ? null : browserUrl(data.signedUrl);
}

/** Size and type of an object, or null when it is not there. */
export async function headObject(key: string): Promise<{ bytes: number; type: string | null } | null> {
  const s = r2();
  if (s) return head(s.client, s.bucket, key);
  const i = key.lastIndexOf("/");
  const { data } = await (await cloud()).list(key.slice(0, i), { search: key.slice(i + 1), limit: 10 });
  const hit = data?.find((o) => o.name === key.slice(i + 1));
  const meta = hit?.metadata as { size?: number; mimetype?: string } | undefined;
  return typeof meta?.size === "number" ? { bytes: meta.size, type: meta.mimetype ?? null } : null;
}

export async function deleteObject(key: string): Promise<void> {
  const s = r2();
  if (s) {
    await r2Delete(s.client, s.bucket, key).catch(() => {});
    return;
  }
  await (await cloud()).remove([key]).catch(() => {});
}

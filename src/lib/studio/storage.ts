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

export function storageConfigured(): boolean {
  return readR2Config() !== null;
}

/** A short lived GET link to one object, made locally. Null without R2 settings. */
export async function signedGet(key: string): Promise<string | null> {
  const s = r2();
  if (!s) return null;
  try {
    return await presign(s.client, "GET", s.bucket, key, VIEW_TTL_S);
  } catch {
    return null;
  }
}

/** A PUT link for a custom thumbnail. The browser must send this content type. */
export async function signedPut(key: string, mime: string): Promise<string | null> {
  const s = r2();
  if (!s) return null;
  return presign(s.client, "PUT", s.bucket, key, PUT_TTL_S, undefined, { "Content-Type": mime });
}

/** Size and type of an object, or null when it is not there. */
export async function headObject(key: string): Promise<{ bytes: number; type: string | null } | null> {
  const s = r2();
  if (!s) return null;
  return head(s.client, s.bucket, key);
}

export async function deleteObject(key: string): Promise<void> {
  const s = r2();
  if (!s) return;
  await r2Delete(s.client, s.bucket, key).catch(() => {});
}

// The media route's view of R2: read a small text file, presign a GET.
import { getText, presign, type R2Client } from "@/lib/r2/s3";
import type { MediaStorage } from "./media.ts";

/** Playlists and the sprite .vtt are a few KB. Anything bigger is not one of ours. */
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

export function createMediaStorage(client: R2Client, bucket: string): MediaStorage {
  return {
    getText: (key) => getText(client, bucket, key, MAX_TEXT_BYTES),
    presign: (key, expiresIn) => presign(client, "GET", bucket, key, expiresIn),
  };
}

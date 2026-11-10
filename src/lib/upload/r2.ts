// R2 through its S3 API (signed with aws4fetch, Worker-safe). Only server
// routes and server functions reach this file.
import {
  abortMultipart,
  completeMultipart,
  createMultipart,
  createR2Client as makeClient,
  head,
  presign,
  type R2Client,
  type R2ClientConfig,
} from "@/lib/r2/s3";
import type { UploadStorage } from "./handlers.ts";

export type { R2ClientConfig, R2Client };

/** A client pointed at the account's R2 endpoint. */
export function createR2Client(config: R2ClientConfig): R2Client {
  return makeClient(config);
}

/** UploadStorage on top of a client and one bucket. */
export function createR2Storage(client: R2Client, bucket: string): UploadStorage {
  return {
    createMultipart: (key, mime) => createMultipart(client, bucket, key, mime),
    presignPart: (key, uploadId, partNumber, expiresIn) =>
      presign(client, "PUT", bucket, key, expiresIn, { partNumber: String(partNumber), uploadId }),
    completeMultipart: (key, uploadId, parts) => completeMultipart(client, bucket, key, uploadId, parts),
    abortMultipart: (key, uploadId) => abortMultipart(client, bucket, key, uploadId),
    async objectSize(key) {
      const h = await head(client, bucket, key);
      return h ? h.bytes : null;
    },
  };
}

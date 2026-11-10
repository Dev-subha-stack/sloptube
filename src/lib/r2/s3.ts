// Cloudflare R2 through its S3 API, signed with aws4fetch so it runs in the
// server's Worker runtime. Replaces the AWS SDK the original app used.
import { AwsClient } from "aws4fetch";

export type R2ClientConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type R2Client = { aws: AwsClient; endpoint: string };

export function createR2Client(config: R2ClientConfig): R2Client {
  return {
    aws: new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: "s3",
      region: "auto",
    }),
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
  };
}

function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function objectUrl(client: R2Client, bucket: string, key: string, query?: Record<string, string>): URL {
  const url = new URL(`${client.endpoint}/${encodeURIComponent(bucket)}/${encodeKey(key)}`);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
  return url;
}

export class R2Error extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function send(client: R2Client, method: string, url: URL, init: { headers?: Record<string, string>; body?: string } = {}) {
  const res = await client.aws.fetch(url.toString(), { method, headers: init.headers, body: init.body });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new R2Error(`R2 ${method} ${res.status}: ${text.slice(0, 200)}`, res.status);
  }
  return res;
}

/** A presigned URL (query string auth) for one request, valid expiresIn seconds. */
export async function presign(
  client: R2Client,
  method: "GET" | "PUT" | "HEAD",
  bucket: string,
  key: string,
  expiresIn: number,
  query?: Record<string, string>,
  headers?: Record<string, string>,
): Promise<string> {
  const url = objectUrl(client, bucket, key, { ...(query ?? {}), "X-Amz-Expires": String(expiresIn) });
  const signed = await client.aws.sign(url.toString(), { method, headers, aws: { signQuery: true } });
  return signed.url;
}

function xmlValue(xml: string, tag: string): string | null {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
  return m ? m[1]!.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : null;
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function createMultipart(client: R2Client, bucket: string, key: string, mime: string): Promise<string> {
  const res = await send(client, "POST", objectUrl(client, bucket, key, { uploads: "" }), { headers: { "Content-Type": mime } });
  const id = xmlValue(await res.text(), "UploadId");
  if (!id) throw new Error("R2 did not return an upload id");
  return id;
}

export async function completeMultipart(
  client: R2Client,
  bucket: string,
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[],
): Promise<void> {
  const body =
    "<CompleteMultipartUpload>" +
    parts.map((p) => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${xmlEscape(p.etag)}</ETag></Part>`).join("") +
    "</CompleteMultipartUpload>";
  const res = await send(client, "POST", objectUrl(client, bucket, key, { uploadId }), {
    headers: { "Content-Type": "application/xml" },
    body,
  });
  const text = await res.text();
  if (text.includes("<Error>")) throw new Error(`R2 complete failed: ${xmlValue(text, "Code") ?? "error"}`);
}

export async function abortMultipart(client: R2Client, bucket: string, key: string, uploadId: string): Promise<void> {
  await send(client, "DELETE", objectUrl(client, bucket, key, { uploadId }));
}

/** Size and type of an object, or null when it is not there. */
export async function head(client: R2Client, bucket: string, key: string): Promise<{ bytes: number; type: string | null } | null> {
  const res = await client.aws.fetch(objectUrl(client, bucket, key).toString(), { method: "HEAD" });
  if (res.status === 404) return null;
  if (!res.ok) throw new R2Error(`R2 HEAD ${res.status}`, res.status);
  return { bytes: Number(res.headers.get("content-length") ?? 0), type: res.headers.get("content-type") };
}

/** A small text object, or null when it is not there. */
export async function getText(client: R2Client, bucket: string, key: string, maxBytes: number): Promise<string | null> {
  const res = await client.aws.fetch(objectUrl(client, bucket, key).toString(), { method: "GET" });
  if (res.status === 404) return null;
  if (!res.ok) throw new R2Error(`R2 GET ${res.status}`, res.status);
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new Error("file too big to proxy");
  return res.text();
}

export async function deleteObject(client: R2Client, bucket: string, key: string): Promise<void> {
  const res = await client.aws.fetch(objectUrl(client, bucket, key).toString(), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new R2Error(`R2 DELETE ${res.status}`, res.status);
}

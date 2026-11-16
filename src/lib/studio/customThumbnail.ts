"use client";

// Saves a picture as a video's custom thumbnail: get an upload link, send the file, then switch to it.
async function post(url: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || typeof json.error === "string") throw new Error(typeof json.error === "string" ? json.error : "failed");
  return json;
}

export async function saveCustomThumbnail(videoId: string, file: Blob): Promise<{ name: string; url: string | null }> {
  const sign = await post("/api/studio/thumbnail/sign", { videoId, mime: file.type, bytes: file.size });
  const put = await fetch(String(sign.url), { method: "PUT", headers: { "content-type": file.type }, body: file });
  if (!put.ok) throw new Error("upload_failed");
  const name = String(sign.name);
  const out = await post("/api/studio/thumbnail", { videoId, uploaded: name });
  return { name, url: (out.url as string | null) ?? null };
}

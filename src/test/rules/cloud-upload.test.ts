import { describe, expect, it } from "vitest";
import { completeUpload, signUpload, type UploadContext, type UploadStorage } from "@/lib/upload/handlers";
import { cleanMediaPath } from "@/lib/watch/media";

const USER = "11111111-1111-1111-1111-111111111111";
const VID = "22222222-2222-2222-2222-222222222222";
const KEY = `uploads/${USER}/${VID}/source.mp4`;
const MB = 1024 * 1024;

function ctx(bytes: number, published: string[]): UploadContext {
  let status = "uploading";
  const storage: UploadStorage = {
    singlePart: true,
    createMultipart: async () => "cloud",
    presignPart: async (_k, _u, n) => `https://x.test/storage/v1/object/upload/sign/videos/${n}`,
    completeMultipart: async () => undefined,
    abortMultipart: async () => undefined,
    objectSize: async () => bytes,
  };
  return {
    storage,
    db: {
      createUpload: async () => ({ videoId: VID, key: KEY }),
      getVideo: async () => ({ id: VID, ownerId: USER, status, sourceKey: KEY, sourceBytes: bytes, sourceMime: "video/mp4" }),
      saveDetails: async () => null,
      finishUpload: async () => ((status = "uploaded"), null),
      abandonUpload: async () => null,
    },
    userId: async () => USER,
    flagOn: async () => true,
    afterUpload: async (v) => (published.push(v.id), null),
  };
}

describe("built-in video storage", () => {
  it("sends a 40 MB video up in one piece", async () => {
    const r = await signUpload({ title: "clip", bytes: 40 * MB, mime: "video/mp4" }, ctx(40 * MB, []));
    expect(r.status).toBe(200);
    expect((r.body.parts as unknown[]).length).toBe(1);
  });
  it("refuses a video over 50 MB", async () => {
    const r = await signUpload({ title: "clip", bytes: 50 * MB + 1, mime: "video/mp4" }, ctx(50 * MB + 1, []));
    expect(r.status).toBe(413);
  });
  it("publishes the video as soon as the upload finishes", async () => {
    const published: string[] = [];
    const r = await completeUpload({ videoId: VID, uploadId: "cloud", parts: [{ partNumber: 1, etag: "cloud" }] }, ctx(10 * MB, published));
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("ready");
    expect(published).toEqual([VID]);
  });
  it("serves the stored video file to the player", () => {
    expect(cleanMediaPath(["source.mp4"])).toEqual({ path: "source.mp4", ext: "mp4" });
  });
});

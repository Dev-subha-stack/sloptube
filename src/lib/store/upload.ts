"use client";

import { create } from "zustand";
import { probeVideoFile } from "@/lib/shorts/probe";
import { CompressCancelled, compressVideo, grabFrames, posterAndMeta } from "@/lib/upload/compress";
import { supabase } from "@/integrations/supabase/client";
import { shortProblem } from "@/lib/shorts/rules";
import { useSession } from "@/lib/store/session";
import { SpeedMeter, UploadCancelled, uploadParts, xhrPutPart, type SignedPart } from "@/lib/upload/parts";
import {
  detailsProblem,
  fileProblem,
  MAX_UPLOAD_BYTES,
  titleFromFileName,
  uploadErrorText,
  videoTypeFor,
  type Details,
} from "@/lib/upload/rules";

export type UploadPhase = "idle" | "compressing" | "checking" | "signing" | "uploading" | "finishing" | "done" | "failed";

/** What the built-in compressor did to the picked file. */
export type CompressInfo = { fraction: number; originalBytes: number; finalBytes: number | null; compressed: boolean | null; note: string | null };

/**
 * The "Upload as a Snip" box (feature 11). The file's shape is read in the
 * browser when it is picked; the box can only be ticked when the file is
 * vertical and 60 seconds or less, else `problem` says why. Ticked by itself
 * when the file qualifies. Saved after the upload, with the shorts flag on.
 */
export type ShortBox = { state: "checking" | "ready"; problem: string | null; on: boolean };

type SignResponse = { videoId: string; uploadId: string; parts: SignedPart[]; partSize?: number };

type UploadState = {
  phase: UploadPhase;
  fileName: string;
  total: number;
  sent: number;
  speed: number;
  details: Details;
  videoId: string | null;
  watchUrl: string | null;
  error: string | null;
  /** A short line under the drop zone, like "Upload cancelled". */
  notice: string | null;
  short: ShortBox;
  compress: CompressInfo;
  pick: (file: File) => void;
  setDetails: (patch: Partial<Details>) => void;
  setShortOn: (on: boolean) => void;
  cancel: () => Promise<void>;
  reset: () => void;
};

const emptyDetails: Details = { title: "", description: "", visibility: "private" };
const checkingShort: ShortBox = { state: "checking", problem: null, on: false };
const emptyCompress: CompressInfo = { fraction: 0, originalBytes: 0, finalBytes: null, compressed: null, note: null };

// The running upload lives outside the store: it is not something to render.
let running: { controller: AbortController; videoId: string | null; uploadId: string | null } | null = null;
// Counts picks, so a slow file probe never lands on the next file's box.
let picks = 0;

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!res.ok) throw new Error(json.message || uploadErrorText(json.error));
  return json;
}

export const useUpload = create<UploadState>((set, get) => ({
  phase: "idle",
  fileName: "",
  total: 0,
  sent: 0,
  speed: 0,
  details: emptyDetails,
  videoId: null,
  watchUrl: null,
  error: null,
  notice: null,
  short: checkingShort,
  compress: emptyCompress,

  pick(file) {
    if (running) return;
    // Size is checked after compression: a big file may well fit once squeezed.
    const problem = fileProblem({ name: file.name, type: file.type, size: Math.min(file.size, 1) });
    if (problem) {
      set({ notice: problem });
      return;
    }
    const controller = new AbortController();
    running = { controller, videoId: null, uploadId: null };
    const details = { ...emptyDetails, title: titleFromFileName(file.name) };
    set({
      phase: "compressing",
      compress: { ...emptyCompress, originalBytes: file.size },
      fileName: file.name,
      total: file.size,
      sent: 0,
      speed: 0,
      details,
      videoId: null,
      watchUrl: null,
      error: null,
      notice: null,
      short: checkingShort,
    });

    const seq = ++picks;
    void probeVideoFile(file).then((shape) => {
      if (seq !== picks) return;
      const problem = shortProblem(shape);
      set({ short: { state: "ready", problem, on: problem === null } });
    });

    void (async () => {
      const job = running!;
      try {
        // 1. The built-in compressor (always on).
        let lastPaint = 0;
        const result = await compressVideo(file, {
          signal: controller.signal,
          onProgress: (fraction) => {
            const now = Date.now();
            if (now - lastPaint > 150 || fraction >= 1) {
              lastPaint = now;
              set({ compress: { ...get().compress, fraction } });
            }
          },
        });
        const upload = result.file;
        set({
          total: upload.size,
          compress: {
            fraction: 1,
            originalBytes: file.size,
            finalBytes: upload.size,
            compressed: result.compressed,
            note: result.compressed
              ? null
              : result.reason === "not_smaller"
                ? "Your file was already smaller than the compressed version, so it is uploaded as it is."
                : result.reason === "too_long"
                  ? "This video is too long to fit 50 MB, even compressed. Try a clip under about an hour."
                  : "This browser can't compress video, so the original file is uploaded if it is under 50 MB. Chrome, Edge or Safari compress automatically.",
          },
        });
        const sizeProblem = fileProblem(upload);
        if (sizeProblem && !result.compressed && result.reason === "unsupported" && upload.size > MAX_UPLOAD_BYTES) {
          throw new Error("This browser can't compress video and the file is over 50 MB. Open sloptube in Chrome, Edge or Safari and it compresses automatically.");
        }
        if (sizeProblem) throw new Error(sizeProblem);
        const mime = videoTypeFor(upload)!;

        // 2. The content check, on a few stills from the video.
        set({ phase: "checking" });
        const [frames, poster] = await Promise.all([grabFrames(upload), posterAndMeta(upload)]);

        set({ phase: "signing" });
        const signed = await postJson<SignResponse>(
          "/api/upload/sign",
          { title: details.title, bytes: upload.size, mime },
          controller.signal,
        );
        job.videoId = signed.videoId;
        job.uploadId = signed.uploadId;

        if (frames.length > 0) {
          const verdict = await postJson<{ blocked: boolean }>(
            "/api/moderation/scan",
            { videoId: signed.videoId, frames },
            controller.signal,
          ).catch(() => ({ blocked: false }));
          if (verdict.blocked) {
            void postJson("/api/upload/abort", { videoId: signed.videoId, uploadId: signed.uploadId }).catch(() => undefined);
            running = null;
            set({
              phase: "failed",
              error: "This video breaks the Community Guidelines (sexual content). It was removed and your account is banned.",
            });
            setTimeout(() => {
              void supabase.auth.signOut({ scope: "local" }).then(() => window.location.assign("/login?banned=1"));
            }, 4000);
            return;
          }
        }
        set({ phase: "uploading", videoId: signed.videoId });

        const meter = new SpeedMeter();
        lastPaint = 0;
        const parts = await uploadParts({
          file: upload,
          parts: signed.parts,
          putPart: xhrPutPart,
          signal: controller.signal,
          partSize: signed.partSize,
          onProgress: (sent) => {
            const speed = meter.add(sent);
            const now = Date.now();
            // Paint at most five times a second.
            if (now - lastPaint > 200 || sent === upload.size) {
              lastPaint = now;
              set({ sent, speed });
            }
          },
        });

        set({ phase: "finishing", sent: upload.size });
        const d = get().details;
        const finalDetails = detailsProblem(d) ? { ...d, title: d.title.trim() || details.title } : d;
        const done = await postJson<{ watchUrl: string }>(
          "/api/upload/complete",
          {
            videoId: signed.videoId,
            uploadId: signed.uploadId,
            parts,
            ...finalDetails,
            thumbnail: poster.thumbnail,
            durationS: poster.durationS,
            width: poster.width,
            height: poster.height,
          },
          controller.signal,
        );
        running = null;
        set({ phase: "done", watchUrl: done.watchUrl, details: finalDetails });
        // The "Upload as a Snip" box. Only a file that qualifies has a say;
        // the rest is decided by shape after processing either way.
        const box = get().short;
        if (useSession.getState().flags.shorts && box.state === "ready" && box.problem === null) {
          void postJson("/api/shorts/choice", { videoId: signed.videoId, on: box.on }).catch(() => undefined);
        }
      } catch (err) {
        if (err instanceof UploadCancelled || err instanceof CompressCancelled || controller.signal.aborted) return;
        running = null;
        // Throw the parts away so they do not sit in the bucket.
        if (job.videoId && job.uploadId) {
          void postJson("/api/upload/abort", { videoId: job.videoId, uploadId: job.uploadId }).catch(() => undefined);
        }
        set({ phase: "failed", error: (err as Error).message || uploadErrorText(null) });
      }
    })();
  },

  setDetails(patch) {
    set({ details: { ...get().details, ...patch } });
  },

  setShortOn(on) {
    const { short: box, phase, videoId } = get();
    if (box.state !== "ready" || box.problem !== null) return;
    set({ short: { ...box, on } });
    // Changed after the upload finished: save it now.
    if (phase === "done" && videoId && useSession.getState().flags.shorts) {
      void postJson("/api/shorts/choice", { videoId, on }).catch(() => undefined);
    }
  },

  async cancel() {
    const job = running;
    running = null;
    if (!job) return;
    job.controller.abort();
    set({ ...initialView(), notice: "Upload cancelled." });
    if (job.videoId && job.uploadId) {
      await postJson("/api/upload/abort", { videoId: job.videoId, uploadId: job.uploadId }).catch(() => undefined);
    }
  },

  reset() {
    if (running) return;
    set(initialView());
  },
}));

function initialView() {
  return {
    phase: "idle" as const,
    fileName: "",
    total: 0,
    sent: 0,
    speed: 0,
    details: emptyDetails,
    videoId: null,
    watchUrl: null,
    error: null,
    notice: null,
    short: checkingShort,
    compress: emptyCompress,
  };
}

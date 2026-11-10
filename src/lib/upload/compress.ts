"use client";

// The built-in compressor. Every picked video is re-encoded in the browser
// (WebCodecs, through mediabunny) to H.264/AAC MP4 at the settings from
// compressPlan.ts before anything is uploaded. There is no switch to turn it
// off. The only time the original goes up is when this browser cannot
// encode video at all, or the result would be bigger than the original.

import { planCompression, type CompressPlan } from "./compressPlan";

export type CompressResult = {
  file: File;
  /** false when the original was kept (see reason). */
  compressed: boolean;
  originalBytes: number;
  reason?: "unsupported" | "not_smaller" | "failed";
  plan?: CompressPlan;
};

export class CompressCancelled extends Error {
  constructor() {
    super("cancelled");
  }
}

function outputName(name: string): string {
  const base = name.replace(/\.[^./\\]{1,8}$/, "") || "video";
  return `${base}.mp4`;
}

export async function compressVideo(
  file: File,
  opts: { signal?: AbortSignal; onProgress?: (fraction: number) => void } = {},
): Promise<CompressResult> {
  const keep = (reason: CompressResult["reason"]): CompressResult => ({ file, compressed: false, originalBytes: file.size, reason });
  if (typeof window === "undefined" || typeof (window as { VideoEncoder?: unknown }).VideoEncoder === "undefined") {
    return keep("unsupported");
  }

  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) return keep("failed");
    const audioTrack = await input.getPrimaryAudioTrack();
    const durationS = await input.computeDuration();
    let fps: number | null = null;
    try {
      const stats = await videoTrack.computePacketStats(120);
      fps = stats.averagePacketRate || null;
    } catch {
      fps = null;
    }
    const plan = planCompression({
      width: videoTrack.displayWidth,
      height: videoTrack.displayHeight,
      fps,
      durationS,
    });

    const codec = await mb.getFirstEncodableVideoCodec(["avc", "hevc", "vp9", "av1"], {
      width: plan.width,
      height: plan.height,
      bitrate: plan.videoBitrate,
    });
    if (!codec) return keep("unsupported");
    const audioCodec = audioTrack
      ? await mb.getFirstEncodableAudioCodec(["aac", "opus"], {
          numberOfChannels: Math.min(2, audioTrack.numberOfChannels || 2),
          sampleRate: 48000,
          bitrate: plan.audioBitrate,
        })
      : null;

    const target = new mb.BufferTarget();
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target });
    const conversion = await mb.Conversion.init({
      input,
      output,
      tracks: "primary",
      video: {
        width: plan.width,
        height: plan.height,
        fit: "contain",
        frameRate: plan.frameRate,
        codec,
        bitrate: plan.videoBitrate,
        keyFrameInterval: 2,
        forceTranscode: true,
      },
      audio: audioCodec
        ? { codec: audioCodec, bitrate: plan.audioBitrate, numberOfChannels: Math.min(2, audioTrack!.numberOfChannels || 2), sampleRate: 48000, forceTranscode: true }
        : { discard: true },
    });
    if (!conversion.isValid) return keep("unsupported");

    const onAbort = () => void conversion.cancel();
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    conversion.onProgress = (p) => opts.onProgress?.(Math.max(0, Math.min(1, p)));
    try {
      await conversion.execute();
    } finally {
      opts.signal?.removeEventListener("abort", onAbort);
    }
    if (opts.signal?.aborted) throw new CompressCancelled();

    const buffer = target.buffer;
    if (!buffer || buffer.byteLength === 0) return keep("failed");
    if (buffer.byteLength >= file.size) return { ...keep("not_smaller"), plan };
    const out = new File([buffer], outputName(file.name), { type: "video/mp4" });
    return { file: out, compressed: true, originalBytes: file.size, plan };
  } catch (err) {
    if (opts.signal?.aborted) throw new CompressCancelled();
    console.warn("compressor failed, keeping the original", err);
    return keep("failed");
  } finally {
    input.dispose?.();
  }
}

/**
 * A few small JPEG stills from across the video, for the content filter.
 * Read with a hidden <video>, nothing uploaded for it. Empty when the browser
 * cannot play the file.
 */
export async function grabFrames(file: File, count = 4, maxSide = 384): Promise<string[]> {
  if (typeof document === "undefined") return [];
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  const wait = (ev: string, ms = 8000) =>
    new Promise<boolean>((resolve) => {
      const t = setTimeout(() => resolve(false), ms);
      video.addEventListener(ev, () => { clearTimeout(t); resolve(true); }, { once: true });
      video.addEventListener("error", () => { clearTimeout(t); resolve(false); }, { once: true });
    });
  try {
    if (!(await wait("loadeddata"))) return [];
    const d = Number.isFinite(video.duration) ? video.duration : 0;
    if (!video.videoWidth || d <= 0) return [];
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    const frames: string[] = [];
    for (let i = 0; i < count; i++) {
      video.currentTime = Math.min(d - 0.05, (d * (i + 0.5)) / count);
      if (!(await wait("seeked"))) continue;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", 0.7));
    }
    return frames;
  } catch {
    return [];
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

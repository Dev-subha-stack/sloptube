// The built-in compressor's settings: what size, frame rate and bitrate a
// picked video is squeezed to before it is uploaded. Always on. No imports,
// so tests can load it directly.

/** The largest file the platform takes (keep in step with create_upload()). */
export const PLATFORM_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;

/** The shorter side of the picture is never more than this (1080p). */
export const MAX_SHORT_SIDE = 1080;
/** Frames per second are capped here. */
export const MAX_FPS = 30;
/** Bits per pixel per frame for H.264: low, but clean for talking heads and gameplay alike. */
export const BITS_PER_PIXEL = 0.05;
/** Never below this, or text and faces fall apart. */
export const MIN_VIDEO_BITRATE = 350_000;
/** Never above this: 1080p30 needs no more after a good encode. */
export const MAX_VIDEO_BITRATE = 3_000_000;
export const AUDIO_BITRATE = 96_000;

export type CompressPlan = {
  width: number;
  height: number;
  frameRate: number;
  videoBitrate: number;
  audioBitrate: number;
  /** About how big the result will be, in bytes. */
  estimatedBytes: number;
};

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/**
 * The plan for a source of `width` x `height` at `fps` lasting `durationS`.
 * The picture only ever gets smaller, the frame rate is capped at 30, and
 * the bitrate is cut further when needed so the file fits the platform limit.
 */
export function planCompression(src: { width: number; height: number; fps: number | null; durationS: number }): CompressPlan {
  const w0 = Math.max(2, Math.round(src.width));
  const h0 = Math.max(2, Math.round(src.height));
  const short = Math.min(w0, h0);
  const scale = short > MAX_SHORT_SIDE ? MAX_SHORT_SIDE / short : 1;
  const width = even(w0 * scale);
  const height = even(h0 * scale);
  const fps = src.fps && Number.isFinite(src.fps) && src.fps > 0 ? src.fps : MAX_FPS;
  const frameRate = Math.min(MAX_FPS, Math.round(fps));

  let videoBitrate = Math.round(width * height * frameRate * BITS_PER_PIXEL);
  videoBitrate = Math.min(MAX_VIDEO_BITRATE, Math.max(MIN_VIDEO_BITRATE, videoBitrate));

  const duration = Math.max(1, src.durationS || 1);
  // Leave 5% for the container, then make sure it fits the limit.
  const budget = Math.floor(((PLATFORM_LIMIT_BYTES * 0.95 * 8) / duration) - AUDIO_BITRATE);
  if (videoBitrate > budget) videoBitrate = Math.max(100_000, budget);

  const estimatedBytes = Math.round(((videoBitrate + AUDIO_BITRATE) * duration) / 8);
  return { width, height, frameRate, videoBitrate, audioBitrate: AUDIO_BITRATE, estimatedBytes };
}

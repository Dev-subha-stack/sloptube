// The built-in compressor's settings: what size, frame rate and bitrates a
// picked video is squeezed to before it is uploaded. Always on. The result
// must fit the platform limit, so long videos get a smaller picture and a
// lower bitrate. No imports, so tests can load it directly.

/** The largest file the platform takes (keep in step with create_upload() and MAX_UPLOAD_BYTES). */
export const PLATFORM_LIMIT_BYTES = 50 * 1024 * 1024;

/** Picture sizes tried, by the shorter side, biggest first. */
export const SHORT_SIDES = [1080, 720, 540, 480, 360, 240] as const;
/** Frames per second are capped here; very long videos drop to 24. */
export const MAX_FPS = 30;
export const LOW_FPS = 24;
/** Bits per pixel per frame: about where H.264 still looks clean. */
export const GOOD_BPP = 0.06;
/** Below this the picture gets blocky, so a smaller size is used first. */
export const MIN_BPP = 0.035;
/** Never above this: 1080p30 needs no more after a good encode. */
export const MAX_VIDEO_BITRATE = 2_500_000;
/** Never below this: the floor for a watchable 240p. */
export const MIN_VIDEO_BITRATE = 60_000;
/** Room kept for the MP4 container and encoder overshoot. */
export const SAFETY = 0.9;

export type CompressPlan = {
  width: number;
  height: number;
  frameRate: number;
  videoBitrate: number;
  audioBitrate: number;
  /** About how big the result will be, in bytes. */
  estimatedBytes: number;
  /** false when even the smallest settings can't fit the limit (the video is too long). */
  fits: boolean;
};

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

function audioFor(totalBudget: number): number {
  if (totalBudget >= 600_000) return 96_000;
  if (totalBudget >= 250_000) return 64_000;
  return 32_000;
}

/** The longest video (seconds) that can still fit the limit at the smallest settings. */
export function maxDurationS(limitBytes = PLATFORM_LIMIT_BYTES): number {
  return Math.floor((limitBytes * 8 * SAFETY) / (MIN_VIDEO_BITRATE + 32_000));
}

/**
 * The plan for a source of `width` x `height` at `fps` lasting `durationS`.
 * The picture only ever gets smaller, the frame rate is capped, and the
 * picture size, frame rate and bitrates come down until the file fits
 * `limitBytes`.
 */
export function planCompression(
  src: { width: number; height: number; fps: number | null; durationS: number },
  limitBytes = PLATFORM_LIMIT_BYTES,
): CompressPlan {
  const w0 = Math.max(2, Math.round(src.width));
  const h0 = Math.max(2, Math.round(src.height));
  const srcShort = Math.min(w0, h0);
  const duration = Math.max(1, src.durationS || 1);
  const srcFps = src.fps && Number.isFinite(src.fps) && src.fps > 0 ? Math.round(src.fps) : MAX_FPS;

  const totalBudget = Math.floor((limitBytes * 8 * SAFETY) / duration);
  const audioBitrate = audioFor(totalBudget);
  const videoBudget = Math.min(MAX_VIDEO_BITRATE, totalBudget - audioBitrate);
  const frameRate = Math.min(videoBudget < 400_000 ? LOW_FPS : MAX_FPS, srcFps);

  // The biggest picture (never bigger than the source) that keeps enough bits per pixel.
  const top = Math.min(srcShort, SHORT_SIDES[0]);
  const sides = [top, ...SHORT_SIDES.filter((x) => x < top)];
  const size = (short: number) => {
    const scale = Math.min(1, short / srcShort);
    return { width: even(w0 * scale), height: even(h0 * scale) };
  };
  let chosen = size(sides[sides.length - 1]!);
  for (const s of sides) {
    const d = size(s);
    if (d.width * d.height * frameRate * MIN_BPP <= videoBudget) {
      chosen = d;
      break;
    }
  }

  const wanted = Math.round(chosen.width * chosen.height * frameRate * GOOD_BPP);
  const fits = videoBudget >= MIN_VIDEO_BITRATE;
  const videoBitrate = Math.max(MIN_VIDEO_BITRATE, Math.min(wanted, videoBudget, MAX_VIDEO_BITRATE));
  const estimatedBytes = Math.round(((videoBitrate + audioBitrate) * duration) / 8);
  return { ...chosen, frameRate, videoBitrate, audioBitrate, estimatedBytes, fits };
}

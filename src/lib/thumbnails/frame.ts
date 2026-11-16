// The thumbnail editor's maths: where the picked picture lands on the 1280x720 thumbnail.
// No imports, so tests can load it directly.

export const THUMB_W = 1280;
export const THUMB_H = 720;

/**
 * size: overall scale, 1 = the whole picture just fits.
 * width / height: stretch on each side, 1 = the picture's own shape.
 * x / y: how far the picture is moved, as a share of the thumbnail's width / height (0 = centred).
 */
export type Frame = { size: number; width: number; height: number; x: number; y: number };

export const SIZE_MIN = 0.3;
export const SIZE_MAX = 4;
export const STRETCH_MIN = 0.5;
export const STRETCH_MAX = 2;
export const MOVE_MAX = 1;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));

export function clampFrame(f: Frame): Frame {
  return {
    size: clamp(f.size, SIZE_MIN, SIZE_MAX),
    width: clamp(f.width, STRETCH_MIN, STRETCH_MAX),
    height: clamp(f.height, STRETCH_MIN, STRETCH_MAX),
    x: clamp(f.x, -MOVE_MAX, MOVE_MAX),
    y: clamp(f.y, -MOVE_MAX, MOVE_MAX),
  };
}

/** The size at which the picture covers the whole thumbnail with nothing left empty. */
export function fillSize(imgW: number, imgH: number): number {
  const fit = Math.min(THUMB_W / imgW, THUMB_H / imgH);
  const fill = Math.max(THUMB_W / imgW, THUMB_H / imgH);
  return clamp(fill / fit, SIZE_MIN, SIZE_MAX);
}

/** Starts filled and centred, like YouTube does with an uploaded picture. */
export function startFrame(imgW: number, imgH: number): Frame {
  return { size: fillSize(imgW, imgH), width: 1, height: 1, x: 0, y: 0 };
}

/** The rectangle to draw the picture into, in thumbnail pixels. */
export function drawRect(imgW: number, imgH: number, frame: Frame): { x: number; y: number; w: number; h: number } {
  const f = clampFrame(frame);
  const fit = Math.min(THUMB_W / imgW, THUMB_H / imgH);
  const w = imgW * fit * f.size * f.width;
  const h = imgH * fit * f.size * f.height;
  return { x: (THUMB_W - w) / 2 + f.x * THUMB_W, y: (THUMB_H - h) / 2 + f.y * THUMB_H, w, h };
}

/** True when part of the thumbnail would show the background colour. */
export function leavesGaps(imgW: number, imgH: number, frame: Frame): boolean {
  const r = drawRect(imgW, imgH, frame);
  const e = 0.5;
  return r.x > e || r.y > e || r.x + r.w < THUMB_W - e || r.y + r.h < THUMB_H - e;
}

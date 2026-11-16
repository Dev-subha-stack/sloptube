"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { THUMBNAIL_MAX_BYTES, thumbnailFileProblem } from "@/lib/studio/rules";
import {
  clampFrame,
  drawRect,
  fillSize,
  leavesGaps,
  MOVE_MAX,
  SIZE_MAX,
  SIZE_MIN,
  startFrame,
  STRETCH_MAX,
  STRETCH_MIN,
  THUMB_H,
  THUMB_W,
  type Frame,
} from "@/lib/thumbnails/frame";

/** Draws the picture into a 1280x720 thumbnail at the chosen size and place. */
function paint(canvas: HTMLCanvasElement, img: HTMLImageElement, frame: Frame, background: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, THUMB_W, THUMB_H);
  const r = drawRect(img.naturalWidth, img.naturalHeight, frame);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, r.x, r.y, r.w, r.h);
}

/** JPEG under the 2 MB thumbnail limit: lowers the quality step by step if needed. */
async function exportJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  for (const q of [0.92, 0.85, 0.75, 0.6, 0.45]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= THUMBNAIL_MAX_BYTES) return blob;
  }
  throw new Error("That picture is too detailed to save. Try another one.");
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  show,
  onChange,
  name,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  show: string;
  onChange: (v: number) => void;
  name: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-[13px] leading-5 text-text">
        <span>{label}</span>
        <span className="tabular-nums text-text-2">{show}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        data-thumb-slider={name}
        className="mt-1 w-full accent-[var(--link)]"
      />
    </label>
  );
}

function Mini({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div>
      <p className="mb-1 text-[12px] text-text-2">{label}</p>
      {children}
    </div>
  );
}

/**
 * The thumbnail editor: pick a picture, see it as a thumbnail, and set its size,
 * width, height and place (drag it, or use the sliders). Saves a 1280x720 JPEG.
 */
export function ThumbnailEditor({ onDone, onClose }: { onDone: (file: Blob, previewUrl: string) => void; onClose: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [frame, setFrame] = useState<Frame>({ size: 1, width: 1, height: 1, x: 0, y: 0 });
  const [background, setBackground] = useState("#000000");
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const big = useRef<HTMLCanvasElement>(null);
  const card = useRef<HTMLCanvasElement>(null);
  const small = useRef<HTMLCanvasElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number; w: number; h: number } | null>(null);
  const srcUrl = useRef<string | null>(null);

  useEffect(() => {
    input.current?.click();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (srcUrl.current) URL.revokeObjectURL(srcUrl.current);
    };
  }, [onClose]);

  // Redraw the big preview and the two small ones whenever something changes.
  useEffect(() => {
    if (!img || !big.current) return;
    paint(big.current, img, frame, background);
    for (const c of [card.current, small.current]) {
      const ctx = c?.getContext("2d");
      if (c && ctx) {
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(big.current, 0, 0, c.width, c.height);
      }
    }
  }, [img, frame, background]);

  function choose(file: File | undefined) {
    if (!file) return;
    const bad = thumbnailFileProblem({ type: file.type, size: 1 });
    if (bad) return setProblem(bad);
    if (file.size > 20 * 1024 * 1024) return setProblem("Pick a picture up to 20 MB.");
    setProblem(null);
    const url = URL.createObjectURL(file);
    const next = new Image();
    next.onload = () => {
      if (srcUrl.current) URL.revokeObjectURL(srcUrl.current);
      srcUrl.current = url;
      setImg(next);
      setFrame(startFrame(next.naturalWidth, next.naturalHeight));
    };
    next.onerror = () => {
      URL.revokeObjectURL(url);
      setProblem("That picture could not be opened.");
    };
    next.src = url;
  }

  const update = useCallback((patch: Partial<Frame>) => setFrame((f) => clampFrame({ ...f, ...patch })), []);

  function down(e: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: frame.x, y: frame.y, w: rect.width, h: rect.height };
  }
  function move(e: ReactPointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d) return;
    update({ x: d.x + (e.clientX - d.px) / d.w, y: d.y + (e.clientY - d.py) / d.h });
  }

  async function save() {
    if (!big.current || !img || saving) return;
    setSaving(true);
    setProblem(null);
    try {
      paint(big.current, img, frame, background);
      const blob = await exportJpeg(big.current);
      onDone(blob, URL.createObjectURL(blob));
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "That didn't work.");
      setSaving(false);
    }
  }

  const gaps = img ? leavesGaps(img.naturalWidth, img.naturalHeight, frame) : false;
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add thumbnail"
        data-thumbnail-editor
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[980px] rounded-[4px] bg-surface shadow-[var(--menu-shadow)]"
      >
        <div className="flex items-center justify-between border-b border-divider px-5 py-4">
          <h2 className="text-[20px] font-normal leading-7 text-text">Thumbnail</h2>
          <button type="button" onClick={onClose} className="btn-text">
            Close
          </button>
        </div>

        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          data-thumb-file
          onChange={(e) => choose(e.target.files?.[0])}
        />

        {!img ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[15px] text-text">Pick a picture for your thumbnail</p>
            <p className="mt-1 text-[13px] text-text-2">JPG, PNG or WebP. You can set its size and position next.</p>
            <button type="button" onClick={() => input.current?.click()} className="btn-blue mt-5">
              Choose picture
            </button>
            {problem && (
              <p role="alert" className="mt-3 text-[13px] text-[var(--error)]">
                {problem}
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-6 px-5 py-5 md:grid-cols-[1fr_280px]">
            <div className="min-w-0">
              <canvas
                ref={big}
                width={THUMB_W}
                height={THUMB_H}
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={() => (drag.current = null)}
                onPointerCancel={() => (drag.current = null)}
                className="block aspect-video w-full cursor-grab touch-none rounded-[2px] shadow-[0_0_0_1px_var(--divider)] active:cursor-grabbing"
                aria-label="Thumbnail preview. Drag to move the picture."
                data-thumb-preview
              />
              <p className="mt-2 text-[12px] text-text-2">Drag the picture to move it. Thumbnails are saved at 1280 × 720.</p>

              <div className="mt-4 flex flex-wrap items-end gap-6">
                <Mini label="On the home page">
                  <canvas ref={card} width={320} height={180} className="block w-[240px] rounded-[2px]" data-thumb-card />
                </Mini>
                <Mini label="In search and up next">
                  <canvas ref={small} width={168} height={94} className="block w-[168px] rounded-[2px]" />
                </Mini>
              </div>
            </div>

            <div className="space-y-4">
              <Slider label="Size" name="size" value={frame.size} min={SIZE_MIN} max={SIZE_MAX} step={0.01} show={pct(frame.size)} onChange={(v) => update({ size: v })} />
              <Slider label="Width" name="width" value={frame.width} min={STRETCH_MIN} max={STRETCH_MAX} step={0.01} show={pct(frame.width)} onChange={(v) => update({ width: v })} />
              <Slider label="Height" name="height" value={frame.height} min={STRETCH_MIN} max={STRETCH_MAX} step={0.01} show={pct(frame.height)} onChange={(v) => update({ height: v })} />
              <Slider label="Left / right" name="x" value={frame.x} min={-MOVE_MAX} max={MOVE_MAX} step={0.005} show={pct(frame.x)} onChange={(v) => update({ x: v })} />
              <Slider label="Up / down" name="y" value={frame.y} min={-MOVE_MAX} max={MOVE_MAX} step={0.005} show={pct(frame.y)} onChange={(v) => update({ y: v })} />

              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-text !px-2" onClick={() => setFrame(startFrame(img.naturalWidth, img.naturalHeight))} data-thumb-fill>
                  Fill frame
                </button>
                <button type="button" className="btn-text !px-2" onClick={() => setFrame({ size: 1, width: 1, height: 1, x: 0, y: 0 })} data-thumb-fit>
                  Show whole picture
                </button>
              </div>

              <label className={`flex items-center gap-3 text-[13px] ${gaps ? "text-text" : "text-text-3"}`}>
                <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} aria-label="Background colour" className="h-8 w-10 cursor-pointer rounded-[2px] bg-transparent" />
                Background colour {gaps ? "" : "(shows when the picture doesn't fill the frame)"}
              </label>

              <p className="text-[12px] text-text-3">
                Full size is {Math.round(fillSize(img.naturalWidth, img.naturalHeight) * 100)}% for this picture.
              </p>
            </div>
          </div>
        )}

        {img && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-divider px-5 py-3">
            {problem && (
              <p role="alert" className="mr-auto text-[13px] text-[var(--error)]">
                {problem}
              </p>
            )}
            <button type="button" onClick={() => input.current?.click()} className="btn-text">
              Choose another picture
            </button>
            <button type="button" onClick={onClose} className="btn-text">
              Cancel
            </button>
            <button type="button" onClick={() => void save()} disabled={saving} className="btn-blue" data-thumb-save>
              {saving ? "Saving..." : "Use this thumbnail"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

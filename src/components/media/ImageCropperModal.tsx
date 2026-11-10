"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CloseIcon, RefreshIcon } from "@/components/icons";

export type CropMode = "avatar" | "thumbnail" | "banner";

type Props = {
  isOpen: boolean;
  imageSrc: string | null;
  mode: CropMode;
  onCrop: (croppedDataUrl: string) => void;
  onClose: () => void;
};

const ASPECT_RATIOS: Record<CropMode, number> = {
  avatar: 1, // 1:1
  thumbnail: 16 / 9, // 16:9
  banner: 16 / 9,
};

export function ImageCropperModal({ isOpen, imageSrc, mode, onCrop, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImgElement(img);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const imgRatio = imgElement.width / imgElement.height;
    const canvasRatio = width / height;
    let drawW = width;
    let drawH = height;
    if (imgRatio > canvasRatio) {
      drawW = height * imgRatio;
    } else {
      drawH = width / imgRatio;
    }

    ctx.drawImage(imgElement, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [imgElement, zoom, rotation, offset, mode]);

  if (!isOpen || !imageSrc) return null;

  const handlePointerDown = (e: ReactPointerEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handlePointerMove = (e: ReactPointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cropped = canvas.toDataURL("image/webp", 0.92);
    onCrop(cropped);
    onClose();
  };

  const targetWidth = mode === "avatar" ? 360 : 640;
  const targetHeight = mode === "avatar" ? 360 : Math.round(640 / ASPECT_RATIOS[mode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in backdrop-blur-xs">
      <div className="w-full max-w-[680px] rounded-sm bg-surface shadow-2xl border border-divider overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-divider px-6 py-4">
          <h3 className="text-[18px] font-medium text-text">
            {mode === "avatar"
              ? "Crop Profile Picture (1:1)"
              : mode === "thumbnail"
              ? "Crop Video Thumbnail (16:9)"
              : "Adjust Channel Banner (Responsive)"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-icon hover:bg-hover hover:text-text"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex flex-col items-center justify-center bg-[#111111] p-6 select-none overflow-hidden">
          <div
            className={`relative overflow-hidden shadow-lg cursor-grab active:cursor-grabbing ${
              mode === "avatar" ? "rounded-full" : "rounded-xs"
            }`}
            style={{ width: targetWidth, height: targetHeight }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <canvas
              ref={canvasRef}
              width={targetWidth}
              height={targetHeight}
              className="block h-full w-full pointer-events-none"
            />

            {mode === "banner" && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-full h-[40%] border-y border-dashed border-white/60 bg-white/5 flex items-center justify-center">
                  <div className="w-[60%] h-full border-x border-dashed border-[var(--studio-accent)] flex items-center justify-center">
                    <span className="text-[10px] font-medium text-white/90 bg-black/60 px-1.5 py-0.5 rounded-xs">
                      Text & Logo Safe Area (Mobile + Desktop)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="mt-3 text-[12px] text-[#aaaaaa]">Click and drag image to reposition</p>
        </div>

        <div className="border-t border-divider px-6 py-4 flex flex-wrap items-center justify-between gap-4 bg-surface">
          <div className="flex items-center gap-4 flex-1 min-w-[200px]">
            <span className="text-[13px] text-text-2 font-medium">Zoom</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[var(--studio-accent)] cursor-pointer"
            />
            <span className="text-[12px] text-text-3 w-10 text-right">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xs border border-divider text-[13px] font-medium text-text hover:bg-hover"
            >
              <RefreshIcon className="h-4 w-4" /> Rotate 90°
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setRotation(0);
                setOffset({ x: 0, y: 0 });
              }}
              className="h-8 px-3 rounded-xs border border-divider text-[13px] font-medium text-text-2 hover:text-text hover:bg-hover"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="border-t border-divider px-6 py-3 flex justify-end gap-3 bg-[var(--surface)]">
          <button type="button" onClick={onClose} className="btn-text">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="btn-blue">
            Apply & Save
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import type Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import { hlsXhrSetup } from "@/lib/auth-fetch";

/** Play a short muted clip, then loop from the beginning while the card is hovered. */
const PREVIEW_SECONDS = 3;
const HOVER_DELAY_MS = 800;

export function HoverVideoPreview({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const card = video?.closest("[data-feed-card]");
    if (!video || !card) return;

    let hls: Hls | null = null;
    let delay: ReturnType<typeof setTimeout> | undefined;
    let active = false;
    let previewListeners: { playing: () => void; timeUpdate: () => void; ended: () => void } | null = null;

    const stop = () => {
      active = false;
      if (delay) clearTimeout(delay);
      if (previewListeners) {
        video.removeEventListener("playing", previewListeners.playing);
        video.removeEventListener("timeupdate", previewListeners.timeUpdate);
        video.removeEventListener("ended", previewListeners.ended);
        previewListeners = null;
      }
      hls?.destroy();
      hls = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
      setVisible(false);
    };

    const start = () => {
      stop();
      delay = setTimeout(async () => {
        active = true;
        video.muted = true;
        video.volume = 0;
        const onPlaying = () => active && setVisible(true);
        const onTimeUpdate = () => {
          if (active && Number.isFinite(video.duration) && video.duration > PREVIEW_SECONDS && video.currentTime >= PREVIEW_SECONDS) {
            video.currentTime = 0;
          }
        };
        const onEnded = () => {
          if (active) {
            video.currentTime = 0;
            void video.play().catch(() => {});
          }
        };
        previewListeners = { playing: onPlaying, timeUpdate: onTimeUpdate, ended: onEnded };
        video.addEventListener("playing", onPlaying);
        video.addEventListener("timeupdate", onTimeUpdate);
        video.addEventListener("ended", onEnded);

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src;
          void video.play().catch(() => {});
          return;
        }

        try {
          const { default: HlsClass } = await import("hls.js");
          if (!active || !HlsClass.isSupported()) return;
          hls = new HlsClass({
            xhrSetup: hlsXhrSetup,
            enableWorker: true,
            capLevelToPlayerSize: true,
            maxBufferLength: 5,
            maxMaxBufferLength: 8,
            backBufferLength: 0,
          });
          hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
            if (active) void video.play().catch(() => {});
          });
          hls.on(HlsClass.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              setVisible(false);
              hls?.destroy();
              hls = null;
            }
          });
          hls.loadSource(src);
          hls.attachMedia(video);
        } catch {
          // The sprite preview behind this layer remains as a lightweight fallback.
        }
      }, HOVER_DELAY_MS);
    };

    const onPointerEnter = (event: Event) => {
      if (event instanceof PointerEvent && event.pointerType === "touch") return;
      start();
    };
    card.addEventListener("pointerenter", onPointerEnter);
    card.addEventListener("pointerleave", stop);
    return () => {
      card.removeEventListener("pointerenter", onPointerEnter);
      card.removeEventListener("pointerleave", stop);
      stop();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      aria-hidden
      muted
      playsInline
      preload="none"
      tabIndex={-1}
      className={visible ? "pointer-events-none absolute inset-0 h-full w-full object-cover opacity-100 transition-opacity duration-150" : "pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-150"}
    />
  );
}

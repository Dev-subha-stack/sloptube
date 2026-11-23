"use client";

import type Hls from "hls.js";
import { hlsXhrSetup } from "@/lib/auth-fetch";
import { useEffect, useRef, useState } from "react";
import { PlayIcon, VolumeOffIcon } from "@/components/icons";
import { useWatchPings } from "@/lib/engagement/useWatchPings";
import type { Short } from "@/lib/shorts/types";

/** Safari (desktop and iOS) plays HLS itself; everybody else gets hls.js. */
function preferNative(video: HTMLVideoElement): boolean {
  if (!video.canPlayType("application/vnd.apple.mpegurl")) return false;
  const ua = navigator.userAgent;
  return /safari/i.test(ua) && !/chrome|chromium|crios|android|edg/i.test(ua);
}

/**
 * One short's video. Only the short on screen loads its stream and plays,
 * looping; the others show their poster. It starts muted (browsers only
 * autoplay without sound) until the first tap anywhere on a short, which
 * turns the sound on for this one and every one after it. A later tap
 * pauses and plays. View pings go out like on the watch page, the first one
 * at 3 seconds, when a short's view counts.
 */
function hasSrc(v: HTMLVideoElement | null): boolean {
  return !!v && !!v.getAttribute("src");
}

export function ShortPlayer({
  short,
  active,
  muted,
  pings,
  onUnmute,
}: {
  short: Short;
  active: boolean;
  muted: boolean;
  /** The engagement flag is on: send view pings. */
  pings: boolean;
  onUnmute: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(active);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  useWatchPings(short.id, videoRef, pings && active, { short: true });

  // Load and play the stream while on screen; let it go when scrolled away.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;
    let hls: Hls | null = null;
    let cancelled = false;
    setFailed(false);
    setPaused(false);
    setLoading(true);
    const fail = () => {
      if (cancelled) return;
      setLoading(false);
      setFailed(true);
    };
    const play = () => {
      if (cancelled) return;
      setLoading(true);
      video.play().catch(() => {
        if (!cancelled) {
          setPaused(true);
          // Autoplay can be blocked; show the play control instead of a
          // spinner that can never finish until the viewer taps.
          setLoading(false);
        }
      });
    };
    const direct = !/\.m3u8(\?|$)/i.test(short.src);
    if (direct && short.src.startsWith("/api/media/")) {
      // A plain video file in the built-in storage: ask for a signed link (sign-in attached), then play it as is.
      void fetch(`${short.src}?link=1`)
        .then((r) => (r.ok ? (r.json() as Promise<{ url?: string }>) : null))
        .then((j) => {
          if (cancelled) return;
          if (!j?.url) return fail();
          video.src = j.url;
          play();
        })
        .catch(() => !cancelled && fail());
    } else if (direct || preferNative(video)) {
      video.src = short.src;
      play();
    } else {
      void import("hls.js").then(({ default: HlsClass }) => {
        if (cancelled) return;
        if (!HlsClass.isSupported()) {
          video.src = short.src;
          play();
          return;
        }
        hls = new HlsClass({ xhrSetup: hlsXhrSetup, maxBufferLength: 20, backBufferLength: 30 });
        hls.on(HlsClass.Events.MANIFEST_PARSED, play);
        let retries = 0;
        hls.on(HlsClass.Events.ERROR, (_e, data) => {
          if (!data.fatal || !hls) return;
          // A few retries, then give up instead of flickering forever.
          if (++retries > 3) return fail();
          if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else fail();
        });
        hls.loadSource(new URL(short.src, window.location.href).toString());
        hls.attachMedia(video);
      }).catch(() => {
        if (!cancelled) fail();
      });
    }
    return () => {
      cancelled = true;
      video.pause();
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
      setProgress(0);
      setLoading(false);
    };
  }, [active, short.src]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, active]);

  const tap = () => {
    const video = videoRef.current;
    if (!video) return;
    if (muted) {
      onUnmute();
      video.muted = false;
      if (video.paused) {
        setLoading(true);
        void video.play().catch(() => {
          setPaused(true);
          setLoading(false);
        });
      }
      return;
    }
    if (video.paused) {
      setLoading(true);
      void video.play().catch(() => {
        setPaused(true);
        setLoading(false);
      });
    } else video.pause();
  };

  return (
    <div className="absolute inset-0" data-short-player={active ? "active" : "idle"}>
      <video
        ref={videoRef}
        poster={short.thumbnail}
        loop
        playsInline
        muted={muted}
        preload="none"
        onLoadStart={() => active && setLoading(true)}
        onPlay={() => setPaused(false)}
        onPlaying={() => {
          setLoading(false);
          setPaused(false);
        }}
        onWaiting={() => {
          if (active && !videoRef.current?.paused) setLoading(true);
        }}
        onError={() => active && hasSrc(videoRef.current) && (setLoading(false), setFailed(true))}
        onPause={() => {
          setPaused(true);
          setLoading(false);
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration > 0) setProgress(v.currentTime / v.duration);
        }}
        className="h-full w-full bg-black object-cover"
      />
      {active && loading && !failed && (
        <div
          className="pointer-events-none absolute inset-0 z-[1] grid place-items-center bg-black/25"
          role="status"
          aria-live="polite"
          aria-label="Loading Snip"
          data-short-loading
        >
          <span className="flex flex-col items-center gap-3 rounded-xl bg-black/35 px-5 py-4 text-white backdrop-blur-sm">
            <span
              aria-hidden="true"
              className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/30 border-t-white motion-reduce:animate-none"
            />
            <span className="text-[13px] font-medium">Loading Snip…</span>
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={tap}
        aria-label={muted ? "Turn the sound on" : paused ? "Play" : "Pause"}
        data-short-tap
        className="absolute inset-0 cursor-pointer"
      >
        {active && paused && !failed && (
          <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/50">
            <PlayIcon className="h-10 w-10 text-white" />
          </span>
        )}
      </button>
      {active && muted && (
        <span
          data-short-muted
          className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-sm bg-black/60 px-2 py-1 text-[12px] font-medium uppercase tracking-[0.3px] text-white"
        >
          <VolumeOffIcon className="h-4 w-4" />
          Tap to unmute
        </span>
      )}
      {failed && (
        <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-[14px] text-white">This Snip can&apos;t play right now.</p>
      )}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-white/30">
        <div className="h-full bg-[var(--mark)]" style={{ width: `${Math.round(progress * 1000) / 10}%` }} />
      </div>
    </div>
  );
}

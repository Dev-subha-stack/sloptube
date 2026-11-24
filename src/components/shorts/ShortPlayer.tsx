"use client";

import type Hls from "hls.js";
import { hlsXhrSetup } from "@/lib/auth-fetch";
import { useEffect, useRef, useState } from "react";
import { PlayIcon, VolumeOffIcon } from "@/components/icons";
import { useWatchPings } from "@/lib/engagement/useWatchPings";
import { connectMediaSession, isBackgroundPlaybackEnabled } from "@/lib/watch/media-session";
import type { Short } from "@/lib/shorts/types";

/** Safari (desktop and iOS) plays HLS itself; everybody else gets hls.js. */
function preferNative(video: HTMLVideoElement): boolean {
  if (!video.canPlayType("application/vnd.apple.mpegurl")) return false;
  const ua = navigator.userAgent;
  return /safari/i.test(ua) && !/chrome|chromium|crios|android|edg/i.test(ua);
}

/**
 * One short's video. Only the short on screen loads its stream and plays,
 * looping; the others show their poster. It starts unmuted. If the browser
 * blocks audible autoplay, the play control appears for a tap. Later taps
 * pause and play. View pings go out like on the watch page, the first one
 * at 3 seconds, when a short's view counts.
 */
function hasSrc(v: HTMLVideoElement | null): boolean {
  return !!v && !!v.getAttribute("src");
}

/** Do not spend mobile data on speculative playback when Data Saver is on. */
function dataSaverEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
}

export function ShortPlayer({
  short,
  active,
  muted,
  pings,
  onUnmute,
  preload = false,
}: {
  short: Short;
  active: boolean;
  muted: boolean;
  /** The engagement flag is on: send view pings. */
  pings: boolean;
  onUnmute: () => void;
  /** Load this video ahead of time without starting playback. */
  preload?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(active);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const activeRef = useRef(active);
  activeRef.current = active;
  const shouldLoad = active || (preload && !dataSaverEnabled());
  const sourceReadyRef = useRef(false);
  const failedRef = useRef(false);
  const hlsRef = useRef<Hls | null>(null);
  const startPlaybackRef = useRef<() => void>(() => undefined);

  useWatchPings(short.id, videoRef, pings && active, { short: true });

  const [backgroundPlayback, setBackgroundPlayback] = useState(true);

  useEffect(() => {
    const read = () => setBackgroundPlayback(isBackgroundPlaybackEnabled());
    read();
    window.addEventListener("storage", read);
    window.addEventListener("sloptube-background-playback-change", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("sloptube-background-playback-change", read);
    };
  }, []);

  // Keep the active Snip available to lock-screen and headset controls.
  useEffect(() => {
    const video = videoRef.current;
    if (!active || !video || !backgroundPlayback) return;
    return connectMediaSession(video, {
      title: short.title,
      artist: short.channel.name,
      album: "SlopTube Snips",
      artwork: short.thumbnail,
    });
  }, [active, backgroundPlayback, short.id, short.title, short.channel.name, short.thumbnail]);

  // Prepare the current Snip and the next two without starting playback early.
  // The effect depends on shouldLoad (not active), so a warmed player is kept
  // alive when it moves from the preload window into the active position.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    let hls: Hls | null = null;
    let cancelled = false;
    let retries = 0;
    sourceReadyRef.current = false;
    failedRef.current = false;
    setFailed(false);
    video.preload = "auto";

    const fail = () => {
      if (cancelled) return;
      failedRef.current = true;
      if (activeRef.current) {
        setLoading(false);
        setFailed(true);
      }
    };

    const playIfActive = () => {
      if (cancelled || !activeRef.current || !sourceReadyRef.current || !video.paused) return;
      setLoading(true);
      video.play().catch(() => {
        if (!cancelled && activeRef.current) {
          setPaused(true);
          // Audible autoplay can be blocked; show the play control instead
          // of leaving a spinner on screen until the viewer taps.
          setLoading(false);
        }
      });
    };
    startPlaybackRef.current = playIfActive;

    const attachDirect = (url: string) => {
      if (cancelled) return;
      video.preload = "auto";
      video.src = url;
      video.load();
      sourceReadyRef.current = true;
      playIfActive();
    };

    const direct = !/\.m3u8(\?|$)/i.test(short.src);
    if (direct && short.src.startsWith("/api/media/")) {
      // Resolve the protected media URL once; the existing auth fetch adds
      // the viewer's bearer token to this same-origin request.
      void fetch(`${short.src}?link=1`)
        .then((r) => (r.ok ? (r.json() as Promise<{ url?: string }>) : null))
        .then((j) => {
          if (cancelled) return;
          if (!j?.url) return fail();
          attachDirect(j.url);
        })
        .catch(() => !cancelled && fail());
    } else if (direct || preferNative(video)) {
      // Native MP4 and Safari's native HLS both use the browser's preload buffer.
      attachDirect(short.src);
    } else {
      void import("hls.js")
        .then(({ default: HlsClass }) => {
          if (cancelled) return;
          if (!HlsClass.isSupported()) {
            attachDirect(short.src);
            return;
          }

          // Upcoming videos only buffer a few seconds. Their existing Hls
          // instance is promoted to the normal active buffer size on playback.
          hls = new HlsClass({
            xhrSetup: hlsXhrSetup,
            maxBufferLength: activeRef.current ? 20 : 8,
            backBufferLength: activeRef.current ? 30 : 4,
          });
          hlsRef.current = hls;
          hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
            sourceReadyRef.current = true;
            playIfActive();
          });
          hls.on(HlsClass.Events.ERROR, (_e, data) => {
            if (!data.fatal || !hls || cancelled) return;
            // Retry a few times, then stop rather than repeatedly flashing.
            if (++retries > 3) return fail();
            if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) hls.startLoad();
            else if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
            else fail();
          });
          hls.loadSource(new URL(short.src, window.location.href).toString());
          hls.attachMedia(video);
        })
        .catch(() => {
          if (!cancelled) fail();
        });
    }

    return () => {
      cancelled = true;
      startPlaybackRef.current = () => undefined;
      sourceReadyRef.current = false;
      video.pause();
      hls?.destroy();
      if (hlsRef.current === hls) hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
      setProgress(0);
      setLoading(false);
    };
  }, [shouldLoad, short.src]);

  // Pause when this Snip leaves the active position, but keep its warmed
  // buffer while it remains one of the next two. Never rebuild its source.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!active) {
      video.pause();
      if (hlsRef.current) {
        hlsRef.current.config.maxBufferLength = 8;
        hlsRef.current.config.backBufferLength = 4;
      }
      return;
    }

    setPaused(false);
    if (failedRef.current) {
      setFailed(true);
      setLoading(false);
      return;
    }
    setFailed(false);
    setLoading(true);
    if (hlsRef.current) {
      hlsRef.current.config.maxBufferLength = 20;
      hlsRef.current.config.backBufferLength = 30;
    }
    startPlaybackRef.current();
  }, [active]);


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
    <div className="absolute inset-0" data-short-player={active ? "active" : "idle"} data-short-preload={preload && !active && shouldLoad ? "true" : undefined}>
      <video
        ref={videoRef}
        poster={short.thumbnail}
        loop
        playsInline
        muted={muted}
        preload={shouldLoad ? "auto" : "none"}
        onLoadStart={() => active && setLoading(true)}
        onPlay={() => setPaused(false)}
        onPlaying={() => {
          setLoading(false);
          setPaused(false);
        }}
        onWaiting={() => {
          if (active && !videoRef.current?.paused) setLoading(true);
        }}
        onError={() => {
          if (hasSrc(videoRef.current)) {
            failedRef.current = true;
            if (activeRef.current) {
              setLoading(false);
              setFailed(true);
            }
          }
        }}
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

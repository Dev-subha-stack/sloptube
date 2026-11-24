/**
 * Browser media-session support for lock-screen, notification and headset
 * controls. Playback stays on the existing HTMLVideoElement: no duplicate
 * stream, service worker, or database changes are needed.
 */
const BACKGROUND_PLAYBACK_KEY = "sloptube-background-playback";

let mediaSessionOwner = 0;

export function isBackgroundPlaybackEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(BACKGROUND_PLAYBACK_KEY) !== "off";
  } catch {
    return true;
  }
}

export function saveBackgroundPlayback(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BACKGROUND_PLAYBACK_KEY, enabled ? "on" : "off");
  } catch {
    // Playback still works in this tab when storage is unavailable.
  }
  window.dispatchEvent(new Event("sloptube-background-playback-change"));
}

export function connectMediaSession(
  video: HTMLVideoElement,
  options: { title: string; artist?: string; album?: string; artwork?: string | null },
): () => void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !navigator.mediaSession) {
    return () => undefined;
  }

  const session = navigator.mediaSession;
  const owner = ++mediaSessionOwner;
  let metadata: MediaMetadata | null = null;

  if (typeof MediaMetadata !== "undefined") {
    let artwork: Array<{ src: string; sizes: string }> | undefined;
    if (options.artwork) {
      try {
        artwork = [{ src: new URL(options.artwork, window.location.href).toString(), sizes: "512x512" }];
      } catch {
        artwork = undefined;
      }
    }
    metadata = new MediaMetadata({
      title: options.title || "SlopTube video",
      artist: options.artist || "SlopTube",
      album: options.album || "SlopTube",
      ...(artwork ? { artwork } : {}),
    });
    session.metadata = metadata;
  }

  const update = () => {
    session.playbackState = video.ended ? "none" : video.paused ? "paused" : "playing";
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0 || typeof session.setPositionState !== "function") return;
    try {
      session.setPositionState({
        duration,
        playbackRate: Number.isFinite(video.playbackRate) && video.playbackRate > 0 ? video.playbackRate : 1,
        position: Math.min(duration, Math.max(0, video.currentTime || 0)),
      });
    } catch {
      // Some browsers reject position updates while their media session is changing.
    }
  };

  const actions: MediaSessionAction[] = [];
  const register = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
    try {
      session.setActionHandler(action, handler);
      actions.push(action);
    } catch {
      // The action is optional and not implemented by every browser.
    }
  };

  register("play", () => {
    void video.play().catch(() => undefined);
  });
  register("pause", () => video.pause());
  register("seekbackward", (details) => {
    const offset = details.seekOffset ?? 10;
    video.currentTime = Math.max(0, video.currentTime - offset);
  });
  register("seekforward", (details) => {
    const offset = details.seekOffset ?? 10;
    const max = Number.isFinite(video.duration) ? video.duration : Number.POSITIVE_INFINITY;
    video.currentTime = Math.min(max, video.currentTime + offset);
  });
  register("seekto", (details) => {
    if (typeof details.seekTime !== "number" || !Number.isFinite(details.seekTime)) return;
    const max = Number.isFinite(video.duration) ? video.duration : Number.POSITIVE_INFINITY;
    video.currentTime = Math.min(max, Math.max(0, details.seekTime));
  });

  const events = [
    "play",
    "playing",
    "pause",
    "ended",
    "timeupdate",
    "loadedmetadata",
    "durationchange",
    "ratechange",
  ] as const;
  events.forEach((event) => video.addEventListener(event, update));
  update();

  return () => {
    events.forEach((event) => video.removeEventListener(event, update));
    // A newer player (for example, the next Snip) may now own the media session.
    if (mediaSessionOwner !== owner) return;
    actions.forEach((action) => {
      try {
        session.setActionHandler(action, null);
      } catch {
        // Ignore actions unsupported by this browser.
      }
    });
    if (session.metadata === metadata) {
      session.metadata = null;
      session.playbackState = "none";
      try {
        session.setPositionState();
      } catch {
        // Not supported by every browser.
      }
    }
  };
}

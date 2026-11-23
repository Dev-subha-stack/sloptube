const STORAGE_KEY = "sloptube-autoplay-watched-v1";

export const AUTOPLAY_HISTORY_EVENT = "sloptube-autoplay-history-change";

let memoryWatched = new Set<string>();

/** Completed watch-page videos in this browser tab session. */
export function readAutoplayWatched(): Set<string> {
  const watched = new Set(memoryWatched);
  if (typeof window === "undefined") return watched;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      for (const id of parsed) {
        if (typeof id === "string" && id.length > 0) watched.add(id);
      }
    }
  } catch {
    // The in-memory copy still works when session storage is unavailable.
  }
  return watched;
}

/** Remember an ended video and notify the Up next list in the same tab. */
export function markAutoplayWatched(videoId: string): Set<string> {
  const watched = readAutoplayWatched();
  watched.add(videoId);
  memoryWatched = new Set([...watched].slice(-100));
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...memoryWatched]));
    } catch {
      // Autoplay still skips this video for the current tab session.
    }
    window.dispatchEvent(new Event(AUTOPLAY_HISTORY_EVENT));
  }
  return watched;
}

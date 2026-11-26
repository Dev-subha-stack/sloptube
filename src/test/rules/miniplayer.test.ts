import { describe, expect, it } from "vitest";
import { nextDockStateOnSwap, pickNextAutoplayId, shouldNavigateOnAutoplay } from "@/lib/watch/miniplayer";

describe("miniplayer autoplay rules", () => {
  it("stays on the current page instead of navigating to /watch when in miniplayer mode", () => {
    expect(shouldNavigateOnAutoplay(true)).toBe(false);
    expect(shouldNavigateOnAutoplay(false)).toBe(true);
  });

  it("keeps miniplayer mode and dragged position when swapping to the next video", () => {
    const pos = { x: 40, y: 120 };
    const state = { player: { videoId: "vid-1" }, mini: true, miniPos: pos };
    const next = nextDockStateOnSwap(state, { videoId: "vid-2" });
    expect(next.mini).toBe(true);
    expect(next.player).toEqual({ videoId: "vid-2" });
    expect(next.miniPos).toEqual(pos);
  });

  it("ignores a stale next-video swap if the miniplayer was closed or expanded", () => {
    const closed = { player: null, mini: false, miniPos: null };
    expect(nextDockStateOnSwap(closed, { videoId: "vid-2" })).toBe(closed);

    const expanded = { player: { videoId: "vid-1" }, mini: false, miniPos: null };
    expect(nextDockStateOnSwap(expanded, { videoId: "vid-2" })).toBe(expanded);
  });

  it("picks the first unwatched candidate and skips the current video", () => {
    const watched = new Set(["vid-1", "vid-2"]);
    expect(pickNextAutoplayId("vid-1", ["vid-1", "vid-2", "vid-3", "vid-4"], watched)).toBe("vid-3");
    expect(pickNextAutoplayId("vid-1", ["vid-1", "vid-2"], watched)).toBeNull();
  });
});
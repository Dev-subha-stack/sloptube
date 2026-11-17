import { describe, expect, it } from "vitest";
import { EMOJI_MAX, cleanEmojiName, emojiNameProblem, splitEmojis } from "@/lib/emojis/rules";

describe("channel emojis", () => {
  it("allows up to 50 emojis per channel", () => {
    expect(EMOJI_MAX).toBe(50);
  });

  it("accepts letters, numbers and _ and strips the colons", () => {
    expect(cleanEmojiName(" :Party_Cat: ")).toBe("party_cat");
    expect(emojiNameProblem("party_cat")).toBeNull();
    expect(emojiNameProblem("a")).not.toBeNull();
    expect(emojiNameProblem("no-dash")).not.toBeNull();
  });

  it("turns only the channel's own :name: into pictures", () => {
    const map = new Map([["wave", "/w.webp"]]);
    expect(splitEmojis("hi :wave: and :nope:", map)).toEqual(["hi ", { name: "wave", url: "/w.webp" }, " and :nope:"]);
  });
});

import { drawRect, fillSize, leavesGaps, startFrame } from "@/lib/thumbnails/frame";

describe("thumbnail editor", () => {
  it("starts a tall picture filling the whole 1280x720 frame", () => {
    const f = startFrame(900, 1200);
    expect(leavesGaps(900, 1200, f)).toBe(false);
    const r = drawRect(900, 1200, f);
    expect(Math.round(r.w)).toBe(1280);
  });

  it("height stretches only the height", () => {
    const base = drawRect(1280, 720, { size: 1, width: 1, height: 1, x: 0, y: 0 });
    const tall = drawRect(1280, 720, { size: 1, width: 1, height: 1.5, x: 0, y: 0 });
    expect(tall.w).toBe(base.w);
    expect(tall.h).toBe(base.h * 1.5);
  });

  it("a 16:9 picture already fills at 100%", () => {
    expect(fillSize(1920, 1080)).toBe(1);
  });
});

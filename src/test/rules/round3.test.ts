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

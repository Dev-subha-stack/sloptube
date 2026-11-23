import { describe, expect, it } from "vitest";
import { DM_REACTIONS, nextReaction, reactionChips } from "@/lib/messages/rules";

describe("message reactions", () => {
  it("offers the six reactions", () => {
    expect([...DM_REACTIONS]).toEqual(["👍", "❤️", "😂", "😮", "😢", "🔥"]);
  });

  it("counts each emoji and marks my own", () => {
    const chips = reactionChips({ a: "❤️", b: "❤️", c: "😂" }, "b");
    expect(chips).toEqual([
      { emoji: "❤️", count: 2, mine: true },
      { emoji: "😂", count: 1, mine: false },
    ]);
  });

  it("picking my current reaction again removes it", () => {
    expect(nextReaction("👍", "👍")).toBeNull();
    expect(nextReaction("👍", "🔥")).toBe("🔥");
    expect(nextReaction(null, "😮")).toBe("😮");
  });
});

import { describe, expect, it } from "vitest";
import { DM_REACTIONS, dmErrorText, nextReaction, reactionChips, replySnippet } from "@/lib/messages/rules";

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

describe("message replies", () => {
  it("quotes a deleted message as deleted", () => {
    expect(replySnippet("", true)).toBe("Message deleted");
  });

  it("shortens long messages in the quote", () => {
    const quote = replySnippet("a".repeat(300), false);
    expect(quote.length).toBe(120);
    expect(quote.endsWith("…")).toBe(true);
  });

  it("joins lines in the quote", () => {
    expect(replySnippet("hi\n\nthere", false)).toBe("hi there");
  });

  it("explains a reply to a message from another chat", () => {
    expect(dmErrorText("dm_bad_reply")).toBe("You can only reply to messages in this chat.");
  });
});

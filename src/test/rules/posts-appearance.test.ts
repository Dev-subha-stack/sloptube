import { describe, expect, it } from "vitest";
import { DEFAULT_APPEARANCE, parseAppearance, validHex } from "@/lib/appearance";
import { cleanPollOptions, postImageExt, tallyPollVotes, validatePostBody } from "@/lib/posts/rules";

describe("community posts rules", () => {
  it("rejects empty or overly long post bodies", () => {
    expect(validatePostBody("   ").ok).toBe(false);
    expect(validatePostBody("a".repeat(2001)).ok).toBe(false);
    expect(validatePostBody("  New video tonight!  ")).toEqual({ ok: true, text: "New video tonight!" });
  });

  it("validates poll option counts between 2 and 5", () => {
    expect(cleanPollOptions(["", " "])).toEqual({ ok: true, options: null });
    expect(cleanPollOptions(["Only one"]).ok).toBe(false);
    expect(cleanPollOptions(["A", "B", "C", "D", "E", "F"]).ok).toBe(false);
    expect(cleanPollOptions([" Yes ", " No ", ""])).toEqual({ ok: true, options: ["Yes", "No"] });
  });

  it("tallies poll votes and percentages accurately", () => {
    const res = tallyPollVotes(3, [{ option_index: 0 }, { option_index: 0 }, { option_index: 2 }, { option_index: 9 }]);
    expect(res.total).toBe(3);
    expect(res.counts).toEqual([2, 0, 1]);
    expect(res.percents).toEqual([67, 0, 33]);
  });

  it("accepts only supported post image extensions", () => {
    expect(postImageExt("photo.png", "image/png")).toBe("png");
    expect(postImageExt("photo.jpeg", "image/jpeg")).toBe("jpg");
    expect(postImageExt("clip.mp4", "video/mp4")).toBeNull();
  });
});

describe("expanded appearance rules", () => {
  it("validates custom hex colours and falls back safely", () => {
    expect(validHex("#FF2D95")).toBe("#ff2d95");
    expect(validHex("red")).toBeNull();
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    const parsed = parseAppearance(
      JSON.stringify({
        customAccent: "#12ab34",
        customBackground: "#101820",
        font: "mono",
        fontSize: "lg",
        radius: "pill",
        compact: true,
      }),
    );
    expect(parsed.customAccent).toBe("#12ab34");
    expect(parsed.customBackground).toBe("#101820");
    expect(parsed.font).toBe("mono");
    expect(parsed.fontSize).toBe("lg");
    expect(parsed.radius).toBe("pill");
    expect(parsed.compact).toBe(true);
  });
});
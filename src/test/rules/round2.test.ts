import { describe, expect, it } from "vitest";
import { bugStatusLabel } from "@/components/bugs/bugStatus";
import { MAX_ACCOUNTS, upsertAccount, type SavedAccount } from "@/lib/accounts/switcher";
import { initialReaction, reduceReaction, viewReaction } from "@/lib/engagement/reaction";
import { PLATFORM_LIMIT_BYTES, maxDurationS, planCompression } from "@/lib/upload/compressPlan";
import { fileProblemCode, MAX_UPLOAD_BYTES } from "@/lib/upload/rules";
import { timeAgo } from "@/lib/watch/format";

describe("50 MB upload limit", () => {
  it("is 50 MB for uploads and the compressor", () => {
    expect(MAX_UPLOAD_BYTES).toBe(52_428_800);
    expect(PLATFORM_LIMIT_BYTES).toBe(MAX_UPLOAD_BYTES);
  });
  it("refuses a file over 50 MB and accepts one at 50 MB", () => {
    expect(fileProblemCode({ name: "a.mp4", type: "video/mp4", size: MAX_UPLOAD_BYTES + 1 })).toBe("file_too_big");
    expect(fileProblemCode({ name: "a.mp4", type: "video/mp4", size: MAX_UPLOAD_BYTES })).toBeNull();
  });
});

describe("built-in compressor plan", () => {
  it("plans a 10 minute 4K video to fit under 50 MB", () => {
    const p = planCompression({ width: 3840, height: 2160, fps: 60, durationS: 600 });
    expect(p.fits).toBe(true);
    expect(p.estimatedBytes).toBeLessThan(MAX_UPLOAD_BYTES);
    expect(p.frameRate).toBeLessThanOrEqual(30);
    expect(Math.min(p.width, p.height)).toBeLessThan(2160);
  });
  it("never makes the picture bigger than the source", () => {
    const p = planCompression({ width: 640, height: 360, fps: 30, durationS: 30 });
    expect(p.width).toBe(640);
    expect(p.height).toBe(360);
  });
  it("says a video too long for 50 MB does not fit", () => {
    expect(planCompression({ width: 1920, height: 1080, fps: 30, durationS: maxDurationS() * 3 }).fits).toBe(false);
  });
});

describe("comment times", () => {
  it("reads a database time without a zone as UTC, so 2 minutes ago is not hours ago", () => {
    const now = Date.parse("2026-01-01T12:02:00Z");
    expect(timeAgo("2026-01-01 12:00:00", now)).toBe("2 minutes ago");
    expect(timeAgo("2026-01-01T12:00:00+00:00", now)).toBe("2 minutes ago");
  });
});

describe("like button", () => {
  it("adds one like to a video that already has 2", () => {
    let s = initialReaction({ reaction: null, likes: 2, dislikes: null });
    s = reduceReaction(s, { type: "click", kind: "like" });
    expect(viewReaction(s).likes).toBe(3);
    s = reduceReaction(s, { type: "settled", server: { reaction: "like", likes: 3, dislikes: null } });
    expect(viewReaction(s).likes).toBe(3);
  });
  it("picks up an existing like after sign-in data arrives, so it never drops below the real count", () => {
    let s = initialReaction({ reaction: null, likes: 2, dislikes: null });
    s = reduceReaction(s, { type: "reset", server: { reaction: "like", likes: 2, dislikes: null } });
    expect(viewReaction(s)).toMatchObject({ reaction: "like", likes: 2 });
  });
});

describe("account switching list", () => {
  const acct = (n: number): SavedAccount => ({
    userId: `u${n}`,
    email: null,
    name: `User ${n}`,
    username: `user${n}`,
    avatarUrl: null,
    accessToken: "a",
    refreshToken: "r",
    savedAt: n,
  });
  it("keeps one entry per account, newest first", () => {
    const list = upsertAccount([acct(1), acct(2)], { ...acct(2), name: "Renamed" });
    expect(list.map((a) => a.userId)).toEqual(["u2", "u1"]);
    expect(list[0]!.name).toBe("Renamed");
  });
  it("saves at most 5 accounts", () => {
    let list: SavedAccount[] = [];
    for (let i = 0; i < 8; i++) list = upsertAccount(list, acct(i));
    expect(MAX_ACCOUNTS).toBe(5);
    expect(list).toHaveLength(5);
  });
});

describe("bug report status", () => {
  it("shows Pending and Checked / in review", () => {
    expect(bugStatusLabel("pending")).toBe("Pending");
    expect(bugStatusLabel("in_review")).toBe("Checked / in review");
  });
});

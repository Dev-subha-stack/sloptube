import { describe, expect, it } from "vitest";
import { rowToCard, type FeedRow } from "@/lib/feed/types";

const row: FeedRow = {
  id: "00000000-0000-0000-0000-000000000001",
  title: "t",
  duration_s: 10,
  thumbnail_url: null,
  hls_key: null,
  preview_sprite_key: null,
  published_at: "2026-11-24T00:00:00Z",
  views: 3,
  channel_id: "c",
  channel_handle: "h",
  channel_name: "n",
  channel_avatar_url: null,
};

describe("home grid thumbnails", () => {
  it("shows the placeholder (no picture request) when a video has no thumbnail", () => {
    expect(rowToCard({ ...row, has_thumb: false }, null).thumbnail).toBe("");
  });

  it("uses the saved thumbnail_url when there is one", () => {
    expect(rowToCard({ ...row, thumbnail_url: "https://x/t.jpg", has_thumb: true }, null).thumbnail).toBe("https://x/t.jpg");
  });
});

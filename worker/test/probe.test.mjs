import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_VIDEO_DURATION_S } from "../lib/limits.mjs";
import { parseProbe } from "../lib/probe.mjs";

const makeProbe = (formatDuration, videoDuration = formatDuration) => ({
  format: { duration: String(formatDuration) },
  streams: [
    { codec_type: "video", codec_name: "h264", width: 1920, height: 1080, avg_frame_rate: "30/1", duration: String(videoDuration) },
  ],
});

test("accepts a video at the 60-minute limit", () => {
  assert.equal(parseProbe(makeProbe(MAX_VIDEO_DURATION_S)).durationS, MAX_VIDEO_DURATION_S);
});

test("rejects a 1,000-hour file before ffmpeg encoding", () => {
  assert.throws(() => parseProbe(makeProbe(1000 * 60 * 60)), /60-minute upload limit/);
});

test("a longer stream cannot hide behind a short container duration", () => {
  assert.throws(() => parseProbe(makeProbe(30, 1000 * 60 * 60)), /60-minute upload limit/);
});

test("rejects files without a finite positive duration", () => {
  assert.throws(() => parseProbe(makeProbe("NaN", "NaN")), /no duration/);
});

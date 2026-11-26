export const POST_MAX_LEN = 2000;
export const POST_COMMENT_MAX_LEN = 1000;
export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 5;
export const POLL_OPTION_MAX_LEN = 80;

const ALLOWED_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

export type CommunityPostItem = {
  id: string;
  channelId: string;
  authorId: string;
  body: string;
  imagePath: string | null;
  pollOptions: string[] | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  channel: { id: string; handle: string; name: string; avatarUrl: string | null };
  likedByMe: boolean;
  myVote: number | null;
  voteCounts: number[];
};

export function validatePostBody(raw: string): { ok: true; text: string } | { ok: false; error: string } {
  const text = raw.trim();
  if (!text) return { ok: false, error: "Write something before posting." };
  if (text.length > POST_MAX_LEN) return { ok: false, error: `Posts can be at most ${POST_MAX_LEN} characters.` };
  return { ok: true, text };
}

export function cleanPollOptions(raw: string[]): { ok: true; options: string[] | null } | { ok: false; error: string } {
  const cleaned = raw.map((o) => o.trim()).filter(Boolean);
  if (cleaned.length === 0) return { ok: true, options: null };
  if (cleaned.length < POLL_MIN_OPTIONS) return { ok: false, error: "Add at least 2 poll options." };
  if (cleaned.length > POLL_MAX_OPTIONS) return { ok: false, error: `Polls can have at most ${POLL_MAX_OPTIONS} options.` };
  for (const opt of cleaned) {
    if (opt.length > POLL_OPTION_MAX_LEN) return { ok: false, error: `Each poll option must be ${POLL_OPTION_MAX_LEN} characters or less.` };
  }
  return { ok: true, options: cleaned };
}

export function tallyPollVotes(optionCount: number, votes: { option_index: number }[]): { counts: number[]; total: number; percents: number[] } {
  const counts = Array.from({ length: optionCount }, () => 0);
  for (const v of votes) {
    if (v.option_index >= 0 && v.option_index < optionCount) {
      counts[v.option_index] = (counts[v.option_index] ?? 0) + 1;
    }
  }
  const total = counts.reduce((sum, n) => sum + n, 0);
  const percents = counts.map((c) => (total > 0 ? Math.round((c / total) * 100) : 0));
  return { counts, total, percents };
}

export function postImageExt(fileName: string, mimeType: string): string | null {
  const fromMime = mimeType.split("/")[1]?.toLowerCase() ?? "";
  const normalized = fromMime === "jpeg" ? "jpg" : fromMime;
  if (ALLOWED_EXT.has(normalized)) return normalized;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXT.has(ext) ? ext : null;
}

export function postImageUrl(path: string | null): string | null {
  if (!path) return null;
  return `/api/public/images/posts/${path}`;
}
// Custom channel emojis: names, limits and how :name: turns into a picture.
// No imports, so tests can load it directly.

export const EMOJI_MAX = 50;
export const EMOJI_SIZE_PX = 64;
export const EMOJI_BUCKET = "emojis";

/** Lower-case letters, digits and _, 2 to 32 long, like wave or party_cat. */
export function cleanEmojiName(raw: string): string {
  return raw.trim().replace(/^:+|:+$/g, "").toLowerCase();
}

export function emojiNameProblem(name: string): string | null {
  if (name.length < 2) return "Names need at least 2 characters.";
  if (name.length > 32) return "Names can be up to 32 characters.";
  if (!/^[a-z0-9_]+$/.test(name)) return "Use only letters, numbers and _.";
  return null;
}

export function emojiUrl(path: string): string {
  return `/api/public/images/${EMOJI_BUCKET}/${path}`;
}

export type EmojiPiece = string | { name: string; url: string };

/** Splits text into plain parts and the channel's :name: emojis. Unknown names stay text. */
export function splitEmojis(text: string, emojis: ReadonlyMap<string, string>): EmojiPiece[] {
  if (emojis.size === 0 || !text.includes(":")) return [text];
  const out: EmojiPiece[] = [];
  const re = /:([a-z0-9_]{2,64}):/gi;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const url = emojis.get(m[1]!.toLowerCase());
    if (!url) continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ name: m[1]!.toLowerCase(), url });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length ? out : [text];
}

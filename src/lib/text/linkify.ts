// Splits plain text into text and safe links. No imports, so tests can load it.

export type TextPart = { kind: "text"; text: string } | { kind: "link"; text: string; href: string };

const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAILING = /[.,!?;:)\]}'"]+$/;

/** http(s) and www. addresses become links; anything else (javascript:, data:) stays text. */
export function linkify(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    let raw = m[1];
    const trail = raw.match(TRAILING)?.[0] ?? "";
    // Keep a closing bracket when the link has its own opening one, like Wikipedia links.
    if (trail && !(trail.startsWith(")") && raw.includes("("))) raw = raw.slice(0, raw.length - trail.length);
    const href = raw.toLowerCase().startsWith("www.") ? `https://${raw}` : raw;
    let ok = false;
    try {
      const u = new URL(href);
      ok = u.protocol === "https:" || u.protocol === "http:";
    } catch {
      ok = false;
    }
    if (!ok) continue;
    if (start > last) parts.push({ kind: "text", text: text.slice(last, start) });
    parts.push({ kind: "link", text: raw, href });
    last = start + raw.length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

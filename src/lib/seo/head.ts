// Turns the original app's page metadata objects into TanStack route head() tags.
import type { Metadata } from "next";

type Meta = Record<string, string>;
type Head = { meta: Meta[]; links: { rel: string; href: string }[]; scripts?: { type: string; children: string }[] };

const SITE = "sloptube";
const DEFAULT_DESCRIPTION = "A video platform, built in the open one feature at a time.";

function titleOf(t: Metadata["title"]): string | null {
  if (!t) return null;
  if (typeof t === "string") return t;
  return t.absolute ?? t.default ?? null;
}

export type { Head };

export function metadataToHead(m: Metadata | null | undefined, fallbackTitle = SITE): Head {
  const meta: Meta[] = [];
  const links: { rel: string; href: string }[] = [];
  const title = titleOf(m?.title) ?? fallbackTitle;
  const description = m?.description ?? DEFAULT_DESCRIPTION;
  meta.push({ title });
  meta.push({ name: "description", content: description });
  const og = m?.openGraph ?? null;
  meta.push({ property: "og:title", content: og?.title ?? title });
  meta.push({ property: "og:description", content: og?.description ?? description });
  meta.push({ property: "og:type", content: og?.type ?? "website" });
  if (og?.url) meta.push({ property: "og:url", content: og.url });
  if (og?.siteName) meta.push({ property: "og:site_name", content: og.siteName });
  const ogImages = og?.images ? (typeof og.images === "string" ? [{ url: og.images }] : og.images) : [];
  for (const img of ogImages) {
    if (!/^https?:\/\//.test(img.url)) continue;
    meta.push({ property: "og:image", content: img.url });
    if (img.width) meta.push({ property: "og:image:width", content: String(img.width) });
    if (img.height) meta.push({ property: "og:image:height", content: String(img.height) });
    if (img.alt) meta.push({ property: "og:image:alt", content: img.alt });
  }
  for (const v of og?.videos ?? []) {
    meta.push({ property: "og:video", content: v.url });
    if (v.secureUrl) meta.push({ property: "og:video:secure_url", content: v.secureUrl });
    if (v.type) meta.push({ property: "og:video:type", content: v.type });
    if (v.width) meta.push({ property: "og:video:width", content: String(v.width) });
    if (v.height) meta.push({ property: "og:video:height", content: String(v.height) });
  }
  for (const [k, v] of Object.entries(og ?? {})) {
    if (["title", "description", "type", "url", "siteName", "images", "videos"].includes(k)) continue;
    if (typeof v === "string" || typeof v === "number") meta.push({ property: `og:${k}`, content: String(v) });
  }
  const tw = m?.twitter ?? null;
  meta.push({ name: "twitter:card", content: tw?.card ?? "summary_large_image" });
  if (tw?.title) meta.push({ name: "twitter:title", content: tw.title });
  if (tw?.description) meta.push({ name: "twitter:description", content: tw.description });
  const twImages = tw?.images ? (typeof tw.images === "string" ? [tw.images] : tw.images) : [];
  for (const img of twImages) if (/^https?:\/\//.test(img)) meta.push({ name: "twitter:image", content: img });
  for (const p of tw?.players ?? []) {
    meta.push({ name: "twitter:player", content: p.playerUrl });
    meta.push({ name: "twitter:player:width", content: String(p.width) });
    meta.push({ name: "twitter:player:height", content: String(p.height) });
    if (p.streamUrl) meta.push({ name: "twitter:player:stream", content: p.streamUrl });
  }
  const robots = m?.robots;
  if (robots) {
    const content =
      typeof robots === "string"
        ? robots
        : `${robots.index === false ? "noindex" : "index"}, ${robots.follow === false ? "nofollow" : "follow"}`;
    meta.push({ name: "robots", content });
  }
  for (const [k, v] of Object.entries(m?.other ?? {})) {
    for (const one of Array.isArray(v) ? v : [v]) meta.push({ property: k, content: String(one) });
  }
  const canonical = m?.alternates?.canonical;
  if (canonical) links.push({ rel: "canonical", href: canonical });
  return { meta, links };
}

/** Head tags for a simple page: title and description. */
export function simpleHead(title: string, description: string = DEFAULT_DESCRIPTION): Head {
  return metadataToHead({ title, description });
}

import "server-only";
import type { Metadata } from "next";
import { channelByHandle } from "@/lib/channels/server";
import { channelTitle } from "@/lib/channels/validation";
import type { Channel } from "@/lib/channels/types";
import { shortsState } from "@/lib/shorts/server";
import type { Short } from "@/lib/shorts/types";
import type { WatchVideo } from "@/lib/watch/types";
import { watchPageState } from "@/lib/watch/server";
import { flagOn } from "@/lib/flags";
import { siteConfig } from "@/site.config";
import { channelMetadata, shortMetadata, watchMetadata, type SeoChannel, type SeoVideo } from "./meta";
import { siteOrigin } from "./origin";

const hidden: Metadata["robots"] = { index: false, follow: false };

/**
 * og:video and twitter:player point at /embed/<id> when the yapin flag is on
 * for a signed out visitor (feature 16): link previews are fetched signed out,
 * and the embed page answers only then.
 */
const embedOn = () => flagOn("yapin", null);

export { seoChannel, seoShort, seoVideo } from "./convert";
import { seoChannel, seoShort, seoVideo } from "./convert";

export async function watchPageMetadata(v: string | null): Promise<Metadata> {
  const state = await watchPageState(v);
  const name = siteConfig.siteName;
  if (state.kind === "ready" && !state.preview) return watchMetadata(seoVideo(state.video), await siteOrigin(), name, { embed: await embedOn() });
  if (state.kind === "processing" || state.kind === "owner-processing") {
    return { title: `${state.kind === "processing" ? state.title : state.video.title} | ${name}`, robots: hidden };
  }
  return { title: state.kind === "missing" ? `Video unavailable | ${name}` : `Watch | ${name}`, robots: hidden };
}

/** /@handle and its tabs. */
export async function channelPageMetadata(segment: string, tab: "home" | "videos" | "shorts" | "about"): Promise<Metadata> {
  const state = await channelByHandle(segment);
  if (state.kind === "ready") return channelMetadata(seoChannel(state.channel), await siteOrigin(), siteConfig.siteName, tab);
  return { title: channelTitle(segment, tab === "home" ? undefined : tab[0].toUpperCase() + tab.slice(1)), robots: hidden };
}

/** /shorts/<id>. */
export async function shortPageMetadata(id: string): Promise<Metadata> {
  const state = await shortsState(id);
  if (state.kind === "ready" && state.start) return shortMetadata(seoShort(state.start), await siteOrigin(), siteConfig.siteName, { embed: await embedOn() });
  return { title: `Snips | ${siteConfig.siteName}`, robots: state.kind === "ready" ? undefined : hidden };
}

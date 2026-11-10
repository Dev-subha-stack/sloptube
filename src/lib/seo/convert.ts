// Pure conversions from page data to the share card shapes (safe in the browser).
import { channelTitle } from "@/lib/channels/validation";
import type { Channel } from "@/lib/channels/types";
import type { Short } from "@/lib/shorts/types";
import type { WatchVideo } from "@/lib/watch/types";
import type { SeoChannel, SeoVideo } from "./meta";

export function seoVideo(v: WatchVideo): SeoVideo {
  const top = [...v.renditions].sort((a, b) => b.height - a.height)[0];
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    thumbnail: v.thumbnail,
    durationS: v.durationS,
    date: v.date,
    views: v.views,
    visibility: v.visibility,
    width: top?.width || null,
    height: top?.height || null,
    channel: { handle: v.channel.handle, name: v.channel.name },
  };
}

export function seoShort(s: Short): SeoVideo {
  return {
    id: s.id,
    title: s.title,
    description: "",
    thumbnail: s.thumbnail,
    durationS: s.durationS,
    date: s.publishedAt,
    views: s.views,
    visibility: "public",
    width: s.width,
    height: s.height,
    channel: { handle: s.channel.handle, name: s.channel.name },
  };
}

export function seoChannel(c: Channel): SeoChannel {
  return {
    handle: c.handle,
    name: c.name,
    description: c.description,
    avatarUrl: c.avatarUrl,
    bannerUrl: c.bannerUrl,
    videoCount: c.videoCount,
    subscriberCount: c.subscriberCount,
  };
}

/** /watch?v=<id>. The page reads the same state (watchPageState is cached per request). */

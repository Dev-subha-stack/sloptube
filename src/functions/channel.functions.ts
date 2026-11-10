// The channel page's data for one tab, shared by /c/<handle> and /@<handle>.
import { createServerFn } from "@tanstack/react-start";
import type { Metadata } from "next";
import { metadataToHead, type Head } from "@/lib/seo/head";
import type { ChannelViewData } from "@/components/channel/ChannelView";

export type Tab = "home" | "videos" | "shorts" | "playlists" | "about";

export const loadChannel = createServerFn({ method: "GET" })
  .inputValidator((d: { segment: string; tab: Tab }) => d)
  .handler(async ({ data }) => {
    const { channelByHandle } = await import("@/lib/channels/server");
    const { flagOn } = await import("@/lib/flags");
    const { feedState } = await import("@/lib/feed/server");
    const { channelPageMetadata } = await import("@/lib/seo/pages");
    const { CHANNEL_SHORTS_PAGE } = await import("@/lib/shorts/rules");
    const { segment, tab } = data;
    const state = await channelByHandle(segment);
    let shorts = false;
    let tabState: ChannelViewData["tabState"] = null;
    if (state.kind === "ready") {
      shorts = await flagOn("shorts");
      if (tab === "shorts") {
        tabState = await feedState("channel_shorts", { channelId: state.channel.id, limit: CHANNEL_SHORTS_PAGE });
      } else if (tab === "home" || tab === "videos") {
        tabState = await feedState("channel", { channelId: state.channel.id, limit: tab === "home" ? 8 : undefined });
      }
    }
    const meta = (await channelPageMetadata(segment, tab === "playlists" ? "home" : tab)) as Metadata;
    const out: { segment: string; tab: Tab; data: ChannelViewData; meta: Head } = {
      segment,
      tab,
      data: { state, shorts, tabState },
      meta: metadataToHead(meta),
    };
    return out;
  });

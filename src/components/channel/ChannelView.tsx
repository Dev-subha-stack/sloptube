import { ChannelShorts } from "@/components/shorts/ChannelShorts";
import type { channelByHandle } from "@/lib/channels/server";
import type { feedState } from "@/lib/feed/server";
import { previewChannel, type Channel } from "@/lib/channels/types";
import { ChannelAbout, ChannelHeader, NoVideos, type ChannelTab } from "./ChannelHeader";
import { ChannelDbNotice, ChannelMissing, ChannelsNotSetUp, ChannelsOff } from "./ChannelNotices";
import { ChannelVideos } from "./ChannelVideos";
import { ChannelPlaylists } from "./ChannelPlaylists";
import { PostsFeed } from "@/components/posts/PostsFeed";

type FeedState = Awaited<ReturnType<typeof feedState>>;

export type ChannelViewData = {
  state: Awaited<ReturnType<typeof channelByHandle>>;
  shorts: boolean;
  tabState: FeedState | null;
};

function TabBody({
  tab,
  channel,
  isOwner,
  live = false,
  tabState = null,
}: {
  tab: ChannelTab;
  channel: Channel;
  isOwner?: boolean;
  live?: boolean;
  tabState?: FeedState | null;
}) {
  if (tab === "about") return <ChannelAbout channel={channel} />;
  // Without a database (the preview channel) there is nothing to read.
  if (!live) return <NoVideos isOwner={isOwner} />;
  if (tab === "playlists") return <ChannelPlaylists channel={channel} />;
  if (tab === "posts") {
    return (
      <PostsFeed
        channel={{ id: channel.id, handle: channel.handle, name: channel.name, avatarUrl: channel.avatarUrl }}
        isOwner={Boolean(isOwner)}
      />
    );
  }
  if (!tabState) return <NoVideos isOwner={isOwner} />;
  if (tab === "shorts") return <ChannelShorts channel={channel} isOwner={isOwner} state={tabState} />;
  return <ChannelVideos channel={channel} tab={tab} isOwner={isOwner} state={tabState} />;
}

/**
 * The public channel page for one tab. Reads the request (flags, session),
 * so it is rendered inside a <Suspense> boundary by the route.
 */
export function ChannelView({ segment, tab, data }: { segment: string; tab: ChannelTab; data: ChannelViewData }) {
  const { state, shorts, tabState } = data;

  switch (state.kind) {
    case "off":
      return <ChannelsOff />;
    case "missing":
      return <ChannelMissing />;
    case "not-set-up":
      return <ChannelsNotSetUp />;
    case "no-db": {
      const channel = previewChannel(
        segment.replace(/^(%40|@)/, "").toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 30) || "someone",
      );
      return (
        <div data-channel-state="no-db">
          <ChannelDbNotice />
          <div className="mt-4">
            <ChannelHeader channel={channel} tab={tab} />
          </div>
          <TabBody tab={tab} channel={channel} />
        </div>
      );
    }
    case "ready": {
      return (
        <div data-channel-state="ready">
          <ChannelHeader channel={state.channel} tab={tab} isOwner={state.isOwner} shorts={shorts} />
          <TabBody tab={tab} channel={state.channel} isOwner={state.isOwner} live tabState={tabState} />
        </div>
      );
    }
  }
}

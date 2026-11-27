"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePerms } from "@/lib/store/perms";
import { useSession } from "@/lib/store/session";
import { tallyPollVotes, type CommunityPostItem } from "@/lib/posts/rules";
import { PostCard } from "./PostCard";
import { PostComposer } from "./PostComposer";

type ChannelSummary = { id: string; handle: string; name: string; avatarUrl: string | null };

export function PostsFeed({
  channel,
  isOwner = false,
  showFilter = false,
}: {
  /** When set, shows only this channel's posts. */
  channel?: ChannelSummary;
  isOwner?: boolean;
  showFilter?: boolean;
}) {
  const user = useSession((s) => s.user);
  const isStaff = usePerms((s) => s.isAdmin || (s.perms !== null && s.perms.size > 0));
  const [posts, setPosts] = useState<CommunityPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "following">("all");
  const [myChannel, setMyChannel] = useState<ChannelSummary | null>(channel ?? null);

  useEffect(() => {
    if (channel) {
      setMyChannel(channel);
      return;
    }
    if (!user) {
      setMyChannel(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from("channels")
      .select("id, handle, name, avatar_url")
      .eq("owner_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setMyChannel(data ? { id: data.id, handle: data.handle, name: data.name, avatarUrl: data.avatar_url } : null);
      });
    return () => {
      cancelled = true;
    };
  }, [channel, user]);

  const load = useCallback(async () => {
    setLoading(true);
    let allowedChannels: string[] | null = null;
    if (!channel && filter === "following") {
      if (!user) {
        setPosts([]);
        setLoading(false);
        return;
      }
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("channel_id")
        .eq("subscriber_id", user.id);
      allowedChannels = (subs ?? []).map((s) => s.channel_id);
      if (allowedChannels.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }
    }

    let query = supabase
      .from("community_posts")
      .select("id, channel_id, author_id, body, image_path, poll_options, like_count, comment_count, created_at, channels:channel_id(id, handle, name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (channel) query = query.eq("channel_id", channel.id);
    else if (allowedChannels) query = query.in("channel_id", allowedChannels);

    const { data: rows } = await query;
    const list = rows ?? [];
    const postIds = list.map((r) => r.id);

    const [likesRes, votesRes] = postIds.length
      ? await Promise.all([
          user
            ? supabase.from("community_post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds)
            : Promise.resolve({ data: [] as { post_id: string }[] }),
          supabase.from("community_post_votes").select("post_id, user_id, option_index").in("post_id", postIds),
        ])
      : [{ data: [] as { post_id: string }[] }, { data: [] as { post_id: string; user_id: string; option_index: number }[] }];

    const likedSet = new Set((likesRes.data ?? []).map((l) => l.post_id));
    const votesByPost = new Map<string, { user_id: string; option_index: number }[]>();
    for (const v of votesRes.data ?? []) {
      const arr = votesByPost.get(v.post_id) ?? [];
      arr.push({ user_id: v.user_id, option_index: v.option_index });
      votesByPost.set(v.post_id, arr);
    }

    const mapped: CommunityPostItem[] = list.map((r) => {
      const ch = Array.isArray(r.channels) ? r.channels[0] : r.channels;
      const pollOptions = Array.isArray(r.poll_options)
        ? r.poll_options.filter((x): x is string => typeof x === "string")
        : null;
      const postVotes = votesByPost.get(r.id) ?? [];
      const myVoteRow = user ? postVotes.find((v) => v.user_id === user.id) : undefined;
      const tally = pollOptions ? tallyPollVotes(pollOptions.length, postVotes) : { counts: [] };
      return {
        id: r.id,
        channelId: r.channel_id,
        authorId: r.author_id,
        body: r.body,
        imagePath: r.image_path,
        pollOptions,
        likeCount: r.like_count,
        commentCount: r.comment_count,
        createdAt: r.created_at,
        channel: ch
          ? { id: ch.id, handle: ch.handle, name: ch.name, avatarUrl: ch.avatar_url }
          : { id: r.channel_id, handle: "channel", name: "Channel", avatarUrl: null },
        likedByMe: likedSet.has(r.id),
        myVote: myVoteRow ? myVoteRow.option_index : null,
        voteCounts: tally.counts,
      };
    });

    setPosts(mapped);
    setLoading(false);
  }, [channel, filter, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const canCompose = Boolean(user && myChannel && (channel ? isOwner : true));

  return (
    <div className="mx-auto max-w-[740px] space-y-4 px-4 py-6" data-posts-feed>
      {showFilter && (
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[20px] font-medium text-text">Community posts</h1>
          <div className="flex gap-2">
            {(["all", "following"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                aria-pressed={filter === tab}
                onClick={() => setFilter(tab)}
                className={`rounded-full border px-3.5 py-1 text-[13px] ${
                  filter === tab ? "border-[var(--link)] text-[var(--link)] font-medium" : "border-divider text-text hover:bg-hover"
                }`}
              >
                {tab === "all" ? "All posts" : "Following"}
              </button>
            ))}
          </div>
        </div>
      )}
      {canCompose && myChannel && user && (
        <PostComposer channel={myChannel} userId={user.id} onCreated={() => void load()} />
      )}
      {loading ? (
        <div className="space-y-3" data-posts-loading>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-divider bg-surface" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-divider bg-surface px-6 py-12 text-center" data-posts-empty>
          <p className="text-[15px] text-text">
            {filter === "following" ? "No posts from channels you subscribe to yet." : "No posts yet."}
          </p>
          {canCompose && <p className="mt-1 text-[13px] text-text-2">Share the first update above.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id ?? null}
              isStaff={isStaff}
              onRefresh={() => void load()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
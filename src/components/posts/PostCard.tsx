"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { StaffBadge } from "@/components/admin/RoleBadge";
import { ThumbUpIcon } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { formatAge } from "@/lib/feed/format";
import { POST_COMMENT_MAX_LEN, postImageUrl, type CommunityPostItem } from "@/lib/posts/rules";

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author: { username: string; display_name: string; avatar_url: string | null } | null;
};

export function PostCard({
  post,
  currentUserId,
  isStaff,
  onRefresh,
}: {
  post: CommunityPostItem;
  currentUserId: string | null;
  isStaff: boolean;
  onRefresh: () => void;
}) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [myVote, setMyVote] = useState<number | null>(post.myVote);
  const [voteCounts, setVoteCounts] = useState<number[]>(post.voteCounts);
  const [openComments, setOpenComments] = useState(false);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imgUrl = postImageUrl(post.imagePath);
  const canDelete = currentUserId === post.authorId || isStaff;
  const totalVotes = voteCounts.reduce((s, n) => s + n, 0);

  async function toggleLike() {
    if (!currentUserId) return setError("Sign in to like posts.");
    setError(null);
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    const res = next
      ? await supabase.from("community_post_likes").insert({ post_id: post.id, user_id: currentUserId })
      : await supabase.from("community_post_likes").delete().eq("post_id", post.id).eq("user_id", currentUserId);
    if (res.error) {
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
      setError("Couldn't update like.");
    }
  }

  async function vote(optionIndex: number) {
    if (!currentUserId) return setError("Sign in to vote in polls.");
    setError(null);
    const prev = myVote;
    const nextCounts = [...voteCounts];
    if (prev !== null && prev < nextCounts.length) nextCounts[prev] = Math.max(0, (nextCounts[prev] ?? 0) - 1);
    nextCounts[optionIndex] = (nextCounts[optionIndex] ?? 0) + 1;
    setMyVote(optionIndex);
    setVoteCounts(nextCounts);
    const { error: err } = await supabase
      .from("community_post_votes")
      .upsert({ post_id: post.id, user_id: currentUserId, option_index: optionIndex }, { onConflict: "post_id,user_id" });
    if (err) {
      setMyVote(prev);
      setVoteCounts(voteCounts);
      setError("Couldn't save vote.");
    }
  }

  async function loadComments() {
    setLoadingComments(true);
    const { data } = await supabase
      .from("community_post_comments")
      .select("id, body, created_at, author_id, profiles:author_id(username, display_name, avatar_url)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    const rows: CommentRow[] = (data ?? []).map((r) => {
      const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        id: r.id,
        body: r.body,
        created_at: r.created_at,
        author_id: r.author_id,
        author: prof ? { username: prof.username, display_name: prof.display_name, avatar_url: prof.avatar_url } : null,
      };
    });
    setComments(rows);
    setLoadingComments(false);
  }

  async function toggleComments() {
    const next = !openComments;
    setOpenComments(next);
    if (next) await loadComments();
  }

  async function addComment() {
    if (!currentUserId) return setError("Sign in to comment.");
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase
      .from("community_post_comments")
      .insert({ post_id: post.id, author_id: currentUserId, body: text });
    setBusy(false);
    if (err) return setError("Couldn't add comment.");
    setDraft("");
    setCommentCount((c) => c + 1);
    await loadComments();
  }

  async function deleteComment(id: string) {
    const { error: err } = await supabase.from("community_post_comments").delete().eq("id", id);
    if (!err) {
      setComments((list) => list.filter((c) => c.id !== id));
      setCommentCount((c) => Math.max(0, c - 1));
    }
  }

  async function deletePost() {
    const { error: err } = await supabase.from("community_posts").delete().eq("id", post.id);
    if (err) return setError("Couldn't delete post.");
    onRefresh();
  }

  return (
    <article className="rounded-xl border border-divider bg-surface p-4" data-post-card={post.id}>
      <div className="flex items-start gap-3">
        <Link href={`/@${post.channel.handle}`} className="shrink-0">
          <Avatar name={post.channel.name} url={post.channel.avatarUrl} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
              <Link href={`/@${post.channel.handle}`} className="font-medium text-text hover:underline">
                {post.channel.name}
              </Link>
              <StaffBadge name={post.channel.handle} />
              <span className="text-text-2">· {formatAge(post.createdAt)}</span>
            </div>
            {canDelete && (
              <button
                type="button"
                onClick={deletePost}
                data-post-delete
                className="text-[12px] text-text-2 hover:text-[var(--red)]"
              >
                Delete
              </button>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-5 text-text">{post.body}</p>
          {imgUrl && (
            <img
              src={imgUrl}
              alt="Post attachment"
              loading="lazy"
              className="mt-3 max-h-[460px] w-auto max-w-full rounded-lg border border-divider object-contain"
            />
          )}
          {post.pollOptions && post.pollOptions.length > 0 && (
            <div className="mt-3 space-y-2" data-post-poll>
              {post.pollOptions.map((opt, idx) => {
                const count = voteCounts[idx] ?? 0;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const picked = myVote === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => vote(idx)}
                    data-poll-choice={idx}
                    aria-pressed={picked}
                    className={`relative flex w-full items-center justify-between overflow-hidden rounded-lg border px-3 py-2 text-left text-[13px] ${
                      picked ? "border-[var(--link)] font-medium text-text" : "border-divider text-text hover:bg-hover"
                    }`}
                  >
                    {myVote !== null && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 bg-[var(--link)]/15 transition-[width] duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    )}
                    <span className="relative z-10">{opt}</span>
                    {myVote !== null && <span className="relative z-10 text-[12px] text-text-2">{pct}%</span>}
                  </button>
                );
              })}
              <p className="text-[12px] text-text-2">{totalVotes} {totalVotes === 1 ? "vote" : "votes"}</p>
            </div>
          )}
          {error && <p className="mt-2 text-[12px] text-[var(--red)]">{error}</p>}
          <div className="mt-3 flex items-center gap-4 text-[13px] text-text-2">
            <button
              type="button"
              onClick={toggleLike}
              data-post-like
              aria-pressed={liked}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 hover:bg-hover ${liked ? "text-[var(--link)] font-medium" : ""}`}
            >
              <ThumbUpIcon className="h-4 w-4" />
              <span>{likeCount}</span>
            </button>
            <button
              type="button"
              onClick={toggleComments}
              data-post-comments-toggle
              className="rounded-full px-2.5 py-1 hover:bg-hover"
            >
              {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </button>
          </div>
          {openComments && (
            <div className="mt-3 border-t border-divider pt-3" data-post-comments>
              {currentUserId && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft}
                    maxLength={POST_COMMENT_MAX_LEN}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void addComment()}
                    placeholder="Add a comment..."
                    data-post-comment-input
                    className="flex-1 rounded-full border border-divider bg-page px-3 py-1.5 text-[13px] text-text focus:border-[var(--link)] focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={busy || !draft.trim()}
                    onClick={addComment}
                    data-post-comment-submit
                    className="btn-blue rounded-full px-4 text-[13px] disabled:opacity-50"
                  >
                    Reply
                  </button>
                </div>
              )}
              {loadingComments ? (
                <p className="mt-3 text-[12px] text-text-2">Loading comments…</p>
              ) : comments.length === 0 ? (
                <p className="mt-3 text-[12px] text-text-2">No comments yet.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {comments.map((c) => {
                    const name = c.author?.display_name || c.author?.username || "User";
                    const canDelComment = currentUserId === c.author_id || currentUserId === post.authorId || isStaff;
                    return (
                      <li key={c.id} className="flex items-start gap-2 text-[13px]">
                        <Avatar name={name} url={c.author?.avatar_url ?? null} size={24} />
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-text">{name}</span>
                          {c.author?.username && <StaffBadge name={c.author.username} />}
                          <span className="ml-1.5 text-[11px] text-text-2">{formatAge(c.created_at)}</span>
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-text">{c.body}</p>
                        </div>
                        {canDelComment && (
                          <button
                            type="button"
                            onClick={() => deleteComment(c.id)}
                            className="text-[11px] text-text-2 hover:text-[var(--red)]"
                          >
                            Delete
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
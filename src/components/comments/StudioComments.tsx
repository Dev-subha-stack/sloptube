"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EyeIcon } from "@/components/icons";
import { Avatar } from "@/components/Avatar";
import { DeleteIcon, HeartIcon, PinIcon } from "@/components/icons";
import { commentsErrorMessage, type CommentsMode } from "@/lib/comments/rules";
import type { StudioComment } from "@/lib/comments/types";
import { useSubscriptions } from "@/lib/store/subscriptions";
import { timeAgo } from "@/lib/watch/format";
import { CommentBody } from "./CommentBody";

const MODES: { value: CommentsMode; label: string }[] = [
  { value: "on", label: "Allow all comments" },
  { value: "held", label: "Hold all for review (arrives with moderation)" },
  { value: "off", label: "Turn comments off" },
];

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as { error?: string; mode?: CommentsMode };
  if (!res.ok || json.error) throw new Error(json.error ?? "failed");
  return json;
}

/** /studio/comments: every comment on the owner's videos in one list, with reply, heart, hide and delete. */
export function StudioComments({ comments, channelDefault, now }: { comments: StudioComment[]; channelDefault: CommentsMode; now: number }) {
  const [list, setList] = useState(comments);
  const [mode, setMode] = useState(channelDefault);
  const showToast = useSubscriptions((s) => s.showToast);
  const fail = (err: unknown) => showToast(commentsErrorMessage(err instanceof Error ? err.message : "failed"));

  const heart = async (c: StudioComment) => {
    const on = !c.hearted;
    setList((l) => l.map((x) => (x.id === c.id ? { ...x, hearted: on } : x)));
    try {
      await send("/api/comments/moderate", "POST", { id: c.id, action: on ? "heart" : "unheart" });
    } catch (err) {
      setList((l) => l.map((x) => (x.id === c.id ? { ...x, hearted: !on } : x)));
      fail(err);
    }
  };
  const remove = async (c: StudioComment) => {
    try {
      await send("/api/comments", "DELETE", { id: c.id });
      setList((l) => l.filter((x) => x.id !== c.id));
      showToast("Comment deleted");
    } catch (err) {
      fail(err);
    }
  };
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");
  const [q, setQ] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return list.filter(
      (c) =>
        (filter === "all" || (filter === "hidden") === c.hidden) &&
        (!term || (c.body ?? "").toLowerCase().includes(term) || (c.author?.name ?? "").toLowerCase().includes(term) || c.videoTitle.toLowerCase().includes(term)),
    );
  }, [list, filter, q]);

  const toggleHidden = async (c: StudioComment) => {
    const hidden = !c.hidden;
    setList((l) => l.map((x) => (x.id === c.id ? { ...x, hidden } : x)));
    const { error } = await supabase.rpc("creator_hide_comment", { comment_id: c.id, hidden });
    if (error) {
      setList((l) => l.map((x) => (x.id === c.id ? { ...x, hidden: !hidden } : x)));
      return fail(new Error("failed"));
    }
    showToast(hidden ? "Comment hidden. Viewers no longer see it." : "Comment visible again.");
  };

  const reply = async (c: StudioComment) => {
    const text = replyText.trim();
    if (!text) return;
    setSending(true);
    try {
      await send("/api/comments", "POST", { videoId: c.videoId, body: text, parentId: c.parentId ?? c.id });
      setReplyTo(null);
      setReplyText("");
      showToast("Reply posted");
    } catch (err) {
      fail(err);
    } finally {
      setSending(false);
    }
  };

  const changeMode = async (next: CommentsMode) => {
    const before = mode;
    setMode(next);
    try {
      await send("/api/comments/settings", "POST", { mode: next });
      showToast("Saved. New videos and videos without their own setting follow it.");
    } catch (err) {
      setMode(before);
      fail(err);
    }
  };

  return (
    <div>
      <label className="mb-6 flex flex-wrap items-center gap-3 text-[14px] text-text">
        <span className="font-medium">Comments on your videos</span>
        <select
          value={mode}
          onChange={(e) => void changeMode(e.target.value as CommentsMode)}
          className="h-9 rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-[14px] text-text"
          data-channel-comments-mode
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <div className="mb-4 flex flex-wrap items-center gap-2" data-studio-comment-filters>
        {(["all", "visible", "hidden"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-full border px-3 py-1 text-[13px] ${filter === f ? "border-[var(--link)] text-[var(--link)]" : "border-divider text-text-2"}`}
          >
            {f === "all" ? `All (${list.length})` : f === "visible" ? "Published" : `Hidden (${list.filter((c) => c.hidden).length})`}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search comments"
          className="ml-auto h-9 w-full max-w-[260px] rounded-sm border border-[var(--input-border)] bg-transparent px-3 text-[14px] text-text outline-none"
        />
      </div>

      {list.length === 0 ? (
        <p className="rounded-sm border border-divider bg-surface px-4 py-6 text-center text-[14px] text-text-2" data-studio-comments-empty>
          No comments on your videos yet.
        </p>
      ) : (
        <ul className="divide-y divide-divider rounded-sm border border-divider bg-surface">
          {shown.map((c) => (
            <li key={c.id} className={`flex gap-4 px-4 py-4 ${c.hidden ? "opacity-60" : ""}`} data-studio-comment={c.id} data-hidden={c.hidden ? "1" : undefined}>
              <Avatar name={c.author?.name ?? "?"} url={c.author?.avatarUrl} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-[18px]">
                  <span className="mr-1 font-medium text-text">{c.author?.name}</span>
                  <span className="text-text-2">
                    {timeAgo(c.createdAt, now)}
                    {c.parentId ? " · reply" : ""}
                    {c.pinned ? " · pinned" : ""}
                    {c.hidden ? " · hidden" : ""}
                  </span>
                </p>
                <div className="mt-0.5">
                  <CommentBody text={c.body ?? ""} />
                </div>
                <p className="mt-1 truncate text-[12px] text-text-2">
                  on{" "}
                  <Link href={`/watch?v=${c.videoId}&lc=${c.id}`} className="text-link">
                    {c.videoTitle}
                  </Link>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReplyTo(replyTo === c.id ? null : c.id);
                    setReplyText(c.author?.handle ? `@${c.author.handle} ` : "");
                  }}
                  className="mt-1 text-[12px] font-medium uppercase text-text-2 hover:text-text"
                  data-studio-reply
                >
                  Reply
                </button>
                {replyTo === c.id && (
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      autoFocus
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void reply(c)}
                      placeholder="Add a reply..."
                      className="h-9 flex-1 border-b border-[var(--input-border)] bg-transparent text-[14px] text-text outline-none focus:border-[var(--text)]"
                    />
                    <button type="button" disabled={sending || !replyText.trim()} onClick={() => void reply(c)} className="btn-blue">
                      Reply
                    </button>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-start gap-1">
                {c.pinned && <PinIcon className="mt-2 h-4 w-4 text-icon" />}
                <button
                  type="button"
                  onClick={() => void heart(c)}
                  aria-pressed={c.hearted}
                  aria-label={c.hearted ? "Remove heart" : "Heart"}
                  title={c.hearted ? "Remove heart" : "Heart"}
                  data-studio-heart
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-hover"
                >
                  <HeartIcon className={`h-5 w-5 ${c.hearted ? "text-[#ff0000]" : "text-icon"}`} />
                </button>
                <button
                  type="button"
                  onClick={() => void toggleHidden(c)}
                  aria-pressed={c.hidden}
                  aria-label={c.hidden ? "Show comment" : "Hide comment"}
                  title={c.hidden ? "Show to viewers again" : "Hide from viewers"}
                  data-studio-hide
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-hover"
                >
                  <EyeIcon className={`h-5 w-5 ${c.hidden ? "text-[var(--link)]" : "text-icon"}`} />
                </button>
                <button
                  type="button"
                  onClick={() => void remove(c)}
                  aria-label="Delete"
                  title="Delete"
                  data-studio-delete
                  className="grid h-9 w-9 place-items-center rounded-full hover:bg-hover"
                >
                  <DeleteIcon className="h-5 w-5 text-icon" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

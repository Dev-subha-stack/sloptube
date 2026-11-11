"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { StaffBadge } from "@/components/admin/RoleBadge";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/store/session";
import { formatDate, timeAgo } from "@/lib/watch/format";
import { BUG_STATUSES, bugStatusLabel, bugStatusTone } from "./bugStatus";

export type BugRow = {
  id: string;
  reporter_id: string;
  title: string;
  description: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  reporter?: { username: string; display_name: string; avatar_url: string | null } | null;
};

type BugComment = {
  id: string;
  report_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: { username: string; display_name: string; avatar_url: string | null } | null;
};

const card = "rounded-[2px] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.1)] dark:shadow-none dark:ring-1 dark:ring-divider";
const input =
  "block w-full rounded-[4px] border border-[var(--input-border)] bg-transparent px-3 py-2 text-[14px] text-text outline-none focus:border-[var(--focus)]";

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[12px] font-medium ${bugStatusTone(status)}`} data-bug-status={status}>
      {bugStatusLabel(status)}
    </span>
  );
}

function SignInFirst({ what }: { what: string }) {
  return (
    <div className={`${card} px-6 py-10 text-center`}>
      <p className="text-[16px] text-text">Sign in to {what}.</p>
      <Link href={`/login?next=${encodeURIComponent("/bugs")}`} className="btn-blue mt-4 inline-flex">
        Sign in
      </Link>
    </div>
  );
}

/** /bugs: send a bug report and follow the ones you sent. */
export function MyBugs() {
  const user = useSession((s) => s.user);
  const loaded = useSession((s) => s.loaded);
  const [rows, setRows] = useState<BugRow[] | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bug_reports")
      .select("*")
      .eq("reporter_id", user.id)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as BugRow[]);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const t = title.trim();
    const d = description.trim();
    if (!t || !d) return setMessage({ ok: false, text: "Add a short title and what happened." });
    setBusy(true);
    const { error } = await supabase.from("bug_reports").insert({ reporter_id: user.id, title: t.slice(0, 200), description: d.slice(0, 5000) });
    setBusy(false);
    if (error) return setMessage({ ok: false, text: "The report could not be sent. Try again in a moment." });
    setTitle("");
    setDescription("");
    setMessage({ ok: true, text: "Thanks! Your report was sent. You can follow it below." });
    void refresh();
  }

  if (!loaded) return null;
  return (
    <div className="mx-auto max-w-[860px] px-4 py-6 sm:px-6" data-bugs-page>
      <h1 className="text-[24px] font-normal leading-8 text-text">Report a bug</h1>
      <p className="mt-1 text-[14px] text-text-2">Something broken? Tell us what happened. Staff read every report and reply here.</p>
      {!user ? (
        <div className="mt-6">
          <SignInFirst what="report a bug" />
        </div>
      ) : (
        <>
          <form onSubmit={submit} className={`${card} mt-6 space-y-4 px-4 py-5 sm:px-6`}>
            <label className="block">
              <span className="text-[13px] text-text-2">Title</span>
              <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className={`${input} mt-1`} placeholder="The like button resets after I refresh" />
            </label>
            <label className="block">
              <span className="text-[13px] text-text-2">What happened?</span>
              <textarea
                value={description}
                maxLength={5000}
                rows={5}
                onChange={(e) => setDescription(e.target.value)}
                className={`${input} mt-1 resize-y`}
                placeholder="What you did, what you expected, and what happened instead. The page address helps too."
              />
            </label>
            {message && <p className={`text-[13px] ${message.ok ? "text-text-2" : "text-[var(--error)]"}`} role="status">{message.text}</p>}
            <button type="submit" disabled={busy} className="btn-blue">
              {busy ? "Sending..." : "Send report"}
            </button>
          </form>

          <h2 className="mt-8 text-[18px] text-text">Your reports</h2>
          <div className={`${card} mt-3 divide-y divide-[var(--divider)]`}>
            {rows === null && <p className="px-4 py-6 text-[14px] text-text-2">Loading...</p>}
            {rows?.length === 0 && <p className="px-4 py-6 text-[14px] text-text-2">You haven&apos;t reported any bugs yet.</p>}
            {rows?.map((b) => (
              <Link key={b.id} href={`/bugs/${b.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-hover" data-bug-row={b.id}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-text">{b.title}</span>
                  <span className="block text-[12px] text-text-2">Sent {formatDate(b.created_at)}</span>
                </span>
                <StatusPill status={b.status} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** One report with its conversation. Staff can change the status here too. */
export function BugThread({ id, staffView = false }: { id: string; staffView?: boolean }) {
  const user = useSession((s) => s.user);
  const [bug, setBug] = useState<BugRow | null | undefined>(undefined);
  const [comments, setComments] = useState<BugComment[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [{ data: b }, { data: c }] = await Promise.all([
      supabase.from("bug_reports").select("*, reporter:profiles!bug_reports_reporter_id_fkey(username, display_name, avatar_url)").eq("id", id).maybeSingle(),
      supabase
        .from("bug_report_comments")
        .select("*, author:profiles!bug_report_comments_author_id_fkey(username, display_name, avatar_url)")
        .eq("report_id", id)
        .order("created_at", { ascending: true }),
    ]);
    setBug((b as BugRow | null) ?? null);
    setComments((c ?? []) as BugComment[]);
  }, [id]);

  useEffect(() => {
    if (user) void refresh();
  }, [refresh, user]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!user || !reply.trim()) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("bug_report_comments").insert({ report_id: id, author_id: user.id, body: reply.trim().slice(0, 2000) });
    setBusy(false);
    if (err) return setError("Your reply could not be sent.");
    setReply("");
    void refresh();
  }

  async function setStatus(status: string) {
    setError(null);
    const { error: err } = await supabase.from("bug_reports").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (err) return setError("The status could not be changed.");
    void refresh();
  }

  if (!user) return <SignInFirst what="see this bug report" />;
  if (bug === undefined) return <p className="px-4 py-6 text-[14px] text-text-2">Loading...</p>;
  if (bug === null) return <p className="px-4 py-6 text-[14px] text-text-2">This report isn&apos;t available.</p>;

  const now = Date.now();
  return (
    <div data-bug-thread={bug.id}>
      <div className={`${card} px-4 py-5 sm:px-6`}>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="min-w-0 flex-1 text-[20px] leading-7 text-text">{bug.title}</h1>
          <StatusPill status={bug.status} />
        </div>
        <p className="mt-1 text-[12px] text-text-2">
          {staffView && bug.reporter ? `From @${bug.reporter.username} · ` : ""}Sent {formatDate(bug.created_at)}
        </p>
        <p className="mt-4 whitespace-pre-wrap text-[14px] leading-6 text-text">{bug.description}</p>
        {staffView && (
          <div className="mt-5 flex flex-wrap items-center gap-2" data-bug-status-controls>
            <span className="text-[13px] text-text-2">Status:</span>
            {BUG_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void setStatus(s)}
                aria-pressed={bug.status === s}
                className={`rounded-full border px-3 py-1 text-[12px] font-medium ${bug.status === s ? "border-[var(--link)] text-[var(--link)]" : "border-[var(--divider)] text-text-2 hover:text-text"}`}
              >
                {bugStatusLabel(s)}
              </button>
            ))}
          </div>
        )}
      </div>

      <h2 className="mt-6 text-[16px] text-text">Updates</h2>
      <div className="mt-3 space-y-3">
        {comments.length === 0 && <p className="text-[14px] text-text-2">No replies yet. Staff will post updates here.</p>}
        {comments.map((c) => (
          <div key={c.id} className={`${card} flex gap-3 px-4 py-3`} data-bug-comment={c.id}>
            <Avatar name={c.author?.display_name || c.author?.username || "?"} url={c.author?.avatar_url ?? null} size={32} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px]">
                <span className="font-medium text-text">{c.author?.display_name || c.author?.username}</span>
                <StaffBadge name={c.author?.username} />
                <span className="ml-2 text-text-2">{timeAgo(c.created_at, now)}</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[14px] leading-5 text-text">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="mt-4 space-y-2">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={staffView ? "Write an update for the reporter" : "Add more details"}
          className={`${input} resize-y`}
        />
        {error && <p className="text-[13px] text-[var(--error)]">{error}</p>}
        <button type="submit" disabled={busy || !reply.trim()} className="btn-blue">
          {busy ? "Sending..." : "Post reply"}
        </button>
      </form>
    </div>
  );
}

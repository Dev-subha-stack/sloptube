"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { StatusPill, type BugRow } from "@/components/bugs/BugPages";
import { BUG_STATUSES, bugStatusLabel } from "@/components/bugs/bugStatus";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, timeAgo } from "@/lib/watch/format";
import { card } from "./AdminShell";
import { CustomBadgesFor, RoleBadge } from "./RoleBadge";
import { usePerms } from "@/lib/store/perms";

type AdminUser = {
  id: string;
  email: string | null;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned_at: string | null;
  ban_reason: string | null;
  roles: string[];
  channel_id: string | null;
  channel_handle: string | null;
  video_count: number;
  subscriber_count: number;
  is_owner: boolean;
  total: number;
};

function errorText(message: string | undefined): string {
  if (!message) return "Something went wrong. Try again.";
  if (message.includes("not_admin")) return "Only admins can do this.";
  if (message.includes("not_staff")) return "Only staff can see this.";
  if (message.includes("not_allowed")) return "The owner and your own account can't be changed here.";
  if (message.includes("reason_required")) return "Add a reason first.";
  if (message.includes("invalid_username")) return "Usernames are 3 to 24 letters, numbers or underscores.";
  if (message.includes("username_taken")) return "That username is taken.";
  return "Something went wrong. Try again.";
}

/** /admin/users: every account, with roles and bans. Admins only. */
export function AdminUsers() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const perms = usePerms((s) => s.perms);
  const isAdmin = usePerms((s) => s.isAdmin);
  const canRename = isAdmin || perms?.has("edit_usernames") === true;
  const canBan = isAdmin || perms?.has("ban_users") === true;
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);

  async function rename(u: AdminUser) {
    if (!renaming || renaming.id !== u.id) return;
    const next = renaming.value.trim().replace(/^@/, "").toLowerCase();
    if (!next || next === u.username) return setRenaming(null);
    setBusy(u.id);
    const { error: err } = await supabase.rpc("admin_rename_user", { target: u.id, new_username: next });
    setBusy(null);
    if (err) return setError(errorText(err.message));
    setError(null);
    setRenaming(null);
    void refresh(q);
  }

  const refresh = useCallback(async (term: string) => {
    const { data, error: err } = await supabase.rpc("admin_users", { q: term, lim: 100, off: 0 });
    if (err) {
      setError(errorText(err.message));
      setRows([]);
      return;
    }
    setError(null);
    setRows((data ?? []) as AdminUser[]);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refresh(q), 250);
    return () => clearTimeout(t);
  }, [q, refresh]);

  async function setRole(u: AdminUser, role: "admin" | "moderator", enabled: boolean) {
    setBusy(u.id);
    const { error: err } = await supabase.rpc("admin_set_role", { target: u.id, role, enabled });
    setBusy(null);
    if (err) return setError(errorText(err.message));
    void refresh(q);
  }

  async function setBan(u: AdminUser, banned: boolean) {
    const reason = banned ? window.prompt(`Why are you banning @${u.username}?`)?.trim() : "";
    if (banned && !reason) return;
    setBusy(u.id);
    const { error: err } = await supabase.rpc("admin_set_ban", { target: u.id, banned, reason: reason ?? "" });
    setBusy(null);
    if (err) return setError(errorText(err.message));
    void refresh(q);
  }

  return (
    <div data-admin-users>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, username or email"
        className="mb-4 block w-full max-w-[420px] rounded-[4px] border border-[var(--input-border)] bg-transparent px-3 py-2 text-[14px] text-text outline-none focus:border-[var(--focus)]"
      />
      {error && <p className="mb-3 text-[13px] text-[var(--error)]" role="alert">{error}</p>}
      <p className="mb-2 text-[13px] text-text-2">{rows ? `${rows[0]?.total ?? 0} accounts` : "Loading..."}</p>
      <div className={`${card} divide-y divide-[var(--divider)] overflow-x-auto`}>
        {rows?.map((u) => {
          const admin = u.roles.includes("admin");
          const mod = u.roles.includes("moderator");
          return (
            <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3" data-admin-user={u.username}>
              <Avatar name={u.display_name || u.username} url={u.avatar_url} size={40} />
              <div className="min-w-[200px] flex-1">
                <p className="text-[14px] font-medium text-text">
                  {u.display_name || u.username}
                  <RoleBadge role={u.is_owner ? "owner" : admin ? "admin" : mod ? "moderator" : null} />
                  <CustomBadgesFor name={u.username} />
                  {u.banned_at && <span className="ml-2 rounded-full bg-[var(--error)] px-1.5 py-0.5 text-[11px] text-[var(--badge-text)]">Banned</span>}
                </p>
                {renaming?.id === u.id ? (
                  <form
                    className="mt-1 flex items-center gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void rename(u);
                    }}
                  >
                    <span className="text-[12px] text-text-2">@</span>
                    <input
                      autoFocus
                      value={renaming.value}
                      maxLength={24}
                      onChange={(e) => setRenaming({ id: u.id, value: e.target.value })}
                      aria-label={`New username for @${u.username}`}
                      className="w-[160px] rounded-[4px] border border-[var(--input-border)] bg-transparent px-2 py-1 text-[13px] text-text outline-none focus:border-[var(--focus)]"
                    />
                    <button type="submit" disabled={busy === u.id} className="btn-text !px-2">
                      Save
                    </button>
                    <button type="button" onClick={() => setRenaming(null)} className="btn-text !px-2">
                      Cancel
                    </button>
                  </form>
                ) : (
                  <p className="text-[12px] text-text-2">
                    @{u.username} · {u.email ?? "no email"}
                  </p>
                )}
                <p className="text-[12px] text-text-3">
                  Joined {formatDate(u.created_at)} · {u.last_sign_in_at ? `last seen ${timeAgo(u.last_sign_in_at)}` : "never signed in"} ·{" "}
                  {u.video_count} videos · {u.subscriber_count} subscribers
                  {u.channel_handle && (
                    <>
                      {" · "}
                      <Link href={`/@${u.channel_handle}`} className="text-[var(--link)]">
                        channel
                      </Link>
                    </>
                  )}
                </p>
                {u.banned_at && u.ban_reason && <p className="text-[12px] text-[var(--error)]">Ban reason: {u.ban_reason}</p>}
              </div>
              {canRename && (!u.is_owner || isAdmin) && renaming?.id !== u.id && (
                <button type="button" onClick={() => setRenaming({ id: u.id, value: u.username })} className="btn-text" data-rename-user={u.username}>
                  Change username
                </button>
              )}
              {!u.is_owner && (
                <div className="flex flex-wrap gap-2">
                  {isAdmin && (
                    <>
                      <button type="button" disabled={busy === u.id} onClick={() => void setRole(u, "moderator", !mod)} className="btn-text">
                        {mod ? "Remove mod" : "Make mod"}
                      </button>
                      <button type="button" disabled={busy === u.id} onClick={() => void setRole(u, "admin", !admin)} className="btn-text">
                        {admin ? "Remove admin" : "Make admin"}
                      </button>
                    </>
                  )}
                  {!admin && canBan && (
                    <button type="button" disabled={busy === u.id} onClick={() => void setBan(u, !u.banned_at)} className="btn-text">
                      {u.banned_at ? "Unban" : "Ban"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {rows?.length === 0 && !error && <p className="px-4 py-6 text-[14px] text-text-2">No accounts match.</p>}
      </div>
    </div>
  );
}

/** /admin/bugs and /admin/suggestions: every report of that kind. Admins and moderators. */
export function AdminBugs({ kind = "bug" }: { kind?: "bug" | "idea" }) {
  const idea = kind === "idea";
  const base = idea ? "/admin/suggestions" : "/admin/bugs";
  const [filter, setFilter] = useState<string>("open");
  const [rows, setRows] = useState<BugRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    let query = supabase
      .from("bug_reports")
      .select("*, reporter:profiles!bug_reports_reporter_id_fkey(username, display_name, avatar_url)")
      .eq("kind", kind)
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter === "open") query = query.in("status", ["pending", "in_review"]);
    else if (filter !== "all") query = query.eq("status", filter);
    void query.then(({ data, error: err }) => {
      if (!live) return;
      setError(err ? "The reports could not be read." : null);
      setRows((data ?? []) as BugRow[]);
    });
    return () => {
      live = false;
    };
  }, [filter, kind]);

  return (
    <div data-admin-bugs>
      <div className="mb-4 flex flex-wrap gap-2">
        {["open", ...BUG_STATUSES, "all"].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-full border px-3 py-1 text-[13px] ${filter === f ? "border-[var(--link)] text-[var(--link)]" : "border-[var(--divider)] text-text-2"}`}
          >
            {f === "open" ? "Open" : f === "all" ? "All" : bugStatusLabel(f, idea)}
          </button>
        ))}
      </div>
      {error && <p className="mb-3 text-[13px] text-[var(--error)]">{error}</p>}
      <div className={`${card} divide-y divide-[var(--divider)]`}>
        {rows === null && <p className="px-4 py-6 text-[14px] text-text-2">Loading...</p>}
        {rows?.length === 0 && <p className="px-4 py-6 text-[14px] text-text-2">{idea ? "No suggestions here." : "No bug reports here."}</p>}
        {rows?.map((b) => (
          <Link key={b.id} href={`${base}/${b.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-hover" data-admin-bug={b.id}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-text">{b.title}</span>
              <span className="block truncate text-[12px] text-text-2">
                @{b.reporter?.username ?? "unknown"} · {timeAgo(b.created_at)} · {b.description.slice(0, 120)}
              </span>
            </span>
            <StatusPill status={b.status} idea={idea} />
          </Link>
        ))}
      </div>
    </div>
  );
}

type StaffComment = {
  id: string;
  body: string;
  created_at: string;
  removed: boolean;
  author_id: string;
  author_name: string | null;
  author_handle: string | null;
  video_id: string;
  video_title: string;
  open_reports: number;
};

/** /admin/comments: the newest comments site wide, reported ones flagged. Admins and moderators can remove them. */
export function AdminComments() {
  const [onlyReported, setOnlyReported] = useState(false);
  const [rows, setRows] = useState<StaffComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: err } = await supabase.rpc("staff_recent_comments", { only_reported: onlyReported, lim: 150 });
    setError(err ? errorText(err.message) : null);
    setRows((data ?? []) as StaffComment[]);
  }, [onlyReported]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function remove(c: StaffComment) {
    const reason = window.prompt("Why is this comment being removed?", "Breaks the Community Guidelines")?.trim();
    if (reason === undefined) return;
    const { error: err } = await supabase.rpc("staff_remove_comment", { comment_id: c.id, reason: reason ?? "" });
    if (err) return setError(errorText(err.message));
    void refresh();
  }

  return (
    <div data-admin-comments>
      <label className="mb-4 flex items-center gap-2 text-[14px] text-text">
        <input type="checkbox" checked={onlyReported} onChange={(e) => setOnlyReported(e.target.checked)} className="accent-[var(--link)]" />
        Only reported comments
      </label>
      {error && <p className="mb-3 text-[13px] text-[var(--error)]">{error}</p>}
      <div className={`${card} divide-y divide-[var(--divider)]`}>
        {rows === null && <p className="px-4 py-6 text-[14px] text-text-2">Loading...</p>}
        {rows?.length === 0 && <p className="px-4 py-6 text-[14px] text-text-2">No comments here.</p>}
        {rows?.map((c) => (
          <div key={c.id} className="flex items-start gap-3 px-4 py-3" data-staff-comment={c.id}>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-text-2">
                <span className="font-medium text-text">{c.author_name ?? "unknown"}</span>
                {c.author_handle && <> @{c.author_handle}</>} · {timeAgo(c.created_at)} · on{" "}
                <Link href={`/watch?v=${c.video_id}&lc=${c.id}`} className="text-[var(--link)]">
                  {c.video_title}
                </Link>
                {c.open_reports > 0 && <span className="ml-2 rounded-full bg-[var(--error)] px-1.5 py-0.5 text-[11px] text-[var(--badge-text)]">{c.open_reports} reports</span>}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[14px] text-text">{c.removed ? <em className="text-text-2">Removed</em> : c.body}</p>
            </div>
            {!c.removed && (
              <button type="button" onClick={() => void remove(c)} className="btn-text shrink-0">
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ANNOUNCEMENT_KINDS, BODY_MAX, KIND_LABEL, TITLE_MAX, announcementProblem, type Announcement, type AnnouncementKind } from "@/lib/announcements/rules";
import { useSession } from "@/lib/store/session";
import { AnnouncementCard } from "./AnnouncementList";

const field = "mt-1 block w-full rounded-[4px] border border-[var(--input-border)] bg-transparent px-3 py-2 text-[14px] text-text outline-none focus:border-[var(--focus)]";

/** Admin > Announcements: post a site-wide message, hide or delete old ones. */
export function AdminAnnouncements() {
  const user = useSession((s) => s.user);
  const [rows, setRows] = useState<Announcement[] | null>(null);
  const [kind, setKind] = useState<AnnouncementKind>("update");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, body, kind, link, active, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data ?? []) as Announcement[]);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function post(e: FormEvent) {
    e.preventDefault();
    if (!user || busy) return;
    const problem = announcementProblem(title, body, link);
    if (problem) return setMessage({ ok: false, text: problem });
    setBusy(true);
    setMessage(null);
    const { error } = await supabase
      .from("announcements")
      .insert({ kind, title: title.trim(), body: body.trim(), link: link.trim() || null, created_by: user.id });
    setBusy(false);
    if (error) return setMessage({ ok: false, text: "Only admins can post announcements." });
    setTitle("");
    setBody("");
    setLink("");
    setMessage({ ok: true, text: "Posted. Everyone sees it at the top of the site." });
    void refresh();
  }

  async function toggle(a: Announcement) {
    await supabase.from("announcements").update({ active: !a.active }).eq("id", a.id);
    void refresh();
  }

  async function remove(a: Announcement) {
    if (!window.confirm(`Delete "${a.title}"? This can't be undone.`)) return;
    await supabase.from("announcements").delete().eq("id", a.id);
    void refresh();
  }

  return (
    <div data-admin-announcements>
      <form onSubmit={post} className="rounded-[4px] bg-surface p-4 shadow-[0_0_0_1px_var(--divider)] sm:p-5">
        <h2 className="text-[16px] font-medium text-text">New announcement</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
          <label className="block text-[13px] text-text-2">
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value as AnnouncementKind)} className={field} aria-label="Announcement type">
              {ANNOUNCEMENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[13px] text-text-2">
            Title
            <input value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="Comments now support channel emojis" className={field} aria-label="Announcement title" />
          </label>
        </div>
        <label className="mt-3 block text-[13px] text-text-2">
          Message (optional)
          <textarea value={body} maxLength={BODY_MAX} rows={3} onChange={(e) => setBody(e.target.value)} className={`${field} resize-y`} aria-label="Announcement message" />
        </label>
        <label className="mt-3 block text-[13px] text-text-2">
          Link (optional)
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/updates or https://..." className={field} aria-label="Announcement link" />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className="btn-blue">
            {busy ? "Posting..." : "Post announcement"}
          </button>
          {message && (
            <p role="status" className={`text-[13px] ${message.ok ? "text-text-2" : "text-[var(--error)]"}`}>
              {message.text}
            </p>
          )}
        </div>
      </form>

      <h2 className="mb-3 mt-8 text-[16px] font-medium text-text">Posted</h2>
      {rows === null ? (
        <p className="text-[14px] text-text-2">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-[14px] text-text-2">Nothing posted yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <AnnouncementCard key={a.id} a={a}>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => void toggle(a)} className="btn-text !px-2" data-toggle-announcement>
                  {a.active ? "Hide" : "Show again"}
                </button>
                <button type="button" onClick={() => void remove(a)} className="btn-text !px-2 !text-[var(--error)]">
                  Delete
                </button>
              </div>
            </AnnouncementCard>
          ))}
        </div>
      )}
    </div>
  );
}

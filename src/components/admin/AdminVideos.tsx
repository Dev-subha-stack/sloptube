"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/watch/format";
import { card } from "./AdminShell";

type Row = {
  id: string;
  title: string;
  visibility: string;
  status: string;
  views: number;
  created_at: string;
  deleted_at: string | null;
  removed_at: string | null;
  is_short: boolean;
  channel_name: string;
  channel_handle: string;
  owner_username: string | null;
};

/** Admin > Videos: search every video by title or channel, and delete one for good. */
export function AdminVideos() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async (term: string) => {
    const { data, error: err } = await supabase.rpc("admin_search_videos", { q: term, lim: 100 });
    setError(err ? "You don't have the power to manage videos." : null);
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refresh(q), 250);
    return () => clearTimeout(t);
  }, [q, refresh]);

  async function remove(v: Row) {
    const typed = window.prompt(`Delete "${v.title}" for good? Its comments, likes and stats go too. Type DELETE to confirm.`);
    if (typed?.trim().toUpperCase() !== "DELETE") return;
    setBusy(v.id);
    setNote(null);
    const res = await fetch("/api/admin/videos/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId: v.id }),
    });
    setBusy(null);
    if (!res.ok) return setError(res.status === 403 ? "You don't have the power to delete videos." : "The video could not be deleted. Try again.");
    setNote(`Deleted "${v.title}".`);
    setRows((r) => (r ?? []).filter((x) => x.id !== v.id));
  }

  return (
    <div data-admin-videos>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search videos by title or channel"
        aria-label="Search videos"
        className="mb-4 block w-full max-w-[420px] rounded-[4px] border border-[var(--input-border)] bg-transparent px-3 py-2 text-[14px] text-text outline-none focus:border-[var(--focus)]"
      />
      {error && <p role="alert" className="mb-3 text-[13px] text-[var(--error)]">{error}</p>}
      {note && <p role="status" className="mb-3 text-[13px] text-text-2">{note}</p>}
      <p className="mb-2 text-[13px] text-text-2">{rows ? `${rows.length} videos${rows.length === 100 ? " (first 100)" : ""}` : "Loading..."}</p>
      <div className={`${card} divide-y divide-[var(--divider)]`}>
        {rows?.map((v) => (
          <div key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-3" data-admin-video={v.id}>
            <div className="min-w-0 flex-1">
              <Link href={v.is_short ? `/shorts/${v.id}` : `/watch?v=${v.id}`} className="block truncate text-[14px] font-medium text-text hover:underline">
                {v.title}
              </Link>
              <p className="text-[12px] text-text-2">
                {v.channel_name} (@{v.channel_handle}) · {v.visibility}
                {v.status !== "ready" ? ` · ${v.status}` : ""}
                {v.deleted_at ? " · in trash" : ""}
                {v.removed_at ? " · removed" : ""} · {Number(v.views).toLocaleString("en-US")} views · {formatDate(v.created_at)}
              </p>
            </div>
            <button type="button" disabled={busy === v.id} onClick={() => void remove(v)} className="btn-text !text-[var(--error)]" data-delete-video>
              {busy === v.id ? "Deleting..." : "Delete for good"}
            </button>
          </div>
        ))}
        {rows?.length === 0 && !error && <p className="px-4 py-6 text-[14px] text-text-2">No videos match.</p>}
      </div>
    </div>
  );
}

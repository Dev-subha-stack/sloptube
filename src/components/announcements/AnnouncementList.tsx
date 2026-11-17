"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KIND_LABEL, type Announcement } from "@/lib/announcements/rules";
import { formatDate } from "@/lib/watch/format";

/** One announcement card, used on What's new and in the admin list. */
export function AnnouncementCard({ a, children }: { a: Announcement; children?: React.ReactNode }) {
  const external = a.link?.startsWith("https://");
  return (
    <article className="rounded-[4px] bg-surface p-4 shadow-[0_0_0_1px_var(--divider)] sm:p-5" data-announcement={a.id}>
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-text-2">
        <span className="rounded-[2px] bg-[var(--hover)] px-1.5 py-0.5 font-medium uppercase">{KIND_LABEL[a.kind] ?? "Update"}</span>
        <span>{formatDate(a.created_at)}</span>
        {!a.active && <span className="font-medium text-[var(--error)]">Hidden</span>}
      </div>
      <h2 className="mt-2 text-[16px] font-medium leading-6 text-text">{a.title}</h2>
      {a.body && <p className="mt-1 whitespace-pre-line text-[14px] leading-5 text-text-2">{a.body}</p>}
      {a.link &&
        (external ? (
          <a href={a.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[14px] font-medium text-[var(--link)] hover:underline">
            Learn more
          </a>
        ) : (
          <Link href={a.link} className="mt-2 inline-block text-[14px] font-medium text-[var(--link)] hover:underline">
            Learn more
          </Link>
        ))}
      {children}
    </article>
  );
}

/** The What's new page: every live announcement, newest first. */
export function AnnouncementList() {
  const [rows, setRows] = useState<Announcement[] | null>(null);
  useEffect(() => {
    void supabase
      .from("announcements")
      .select("id, title, body, kind, link, active, created_at")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setRows((data ?? []) as Announcement[]));
  }, []);
  if (rows === null) return <p className="text-[14px] text-text-2">Loading...</p>;
  if (rows.length === 0) return <p className="text-[14px] text-text-2">No announcements yet.</p>;
  return (
    <div className="space-y-3" data-announcement-list>
      {rows.map((a) => (
        <AnnouncementCard key={a.id} a={a} />
      ))}
    </div>
  );
}

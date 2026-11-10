"use client";

import Link from "next/link";
import { Thumb } from "@/components/Thumb";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { BellIcon } from "@/components/icons";
import { Menu } from "@/components/Menu";
import { supabase } from "@/integrations/supabase/client";
import type { FeedCard, FeedPage } from "@/lib/feed/types";
import { badgeLabel, parseSeen, SEEN_KEY } from "@/lib/subscriptions/unread";
import { parseUtc, timeAgo } from "@/lib/watch/format";

function readSeen(): number | null {
  if (typeof window === "undefined") return null;
  try {
    return parseSeen(localStorage.getItem(SEEN_KEY));
  } catch {
    return null;
  }
}

function writeSeen(value: number) {
  try {
    localStorage.setItem(SEEN_KEY, String(value));
  } catch {
    // Private windows and blocked storage: the badge just comes back next time.
  }
}

/** One row in the bell menu: a comment, a reply, a bug report update or an upload. */
type Item = {
  key: string;
  kind: "comment" | "reply" | "bug" | "upload" | "other";
  text: string;
  at: string;
  href: string;
  name: string;
  avatarUrl: string | null;
  thumb: string | null;
  /** Database notifications carry their own read flag; uploads use the "seen" time. */
  read: boolean | null;
  dbId: string | null;
};

type DbNotification = {
  id: string;
  type: string;
  message: string;
  video_id: string | null;
  comment_id: string | null;
  bug_report_id: string | null;
  read: boolean;
  created_at: string;
  actor_name: string | null;
  actor_avatar_url: string | null;
};

async function fetchUploads(): Promise<FeedCard[]> {
  const res = await fetch("/api/subscriptions/feed?notify=1", { cache: "no-store" });
  if (!res.ok) return [];
  return ((await res.json()) as FeedPage).cards;
}

async function fetchDb(): Promise<DbNotification[]> {
  const { data, error } = await supabase.rpc("my_notifications", { lim: 30 });
  if (error || !Array.isArray(data)) return [];
  return data as DbNotification[];
}

function dbHref(n: DbNotification): string {
  if (n.type === "bug" && n.bug_report_id) return `/bugs/${n.bug_report_id}`;
  if (n.video_id && n.comment_id) return `/watch?v=${n.video_id}&lc=${n.comment_id}`;
  if (n.video_id) return `/watch?v=${n.video_id}`;
  return "/";
}

async function fetchAll(): Promise<Item[]> {
  const [uploads, db] = await Promise.all([fetchUploads().catch(() => []), fetchDb().catch(() => [])]);
  const items: Item[] = [
    ...db.map<Item>((n) => ({
      key: `n:${n.id}`,
      kind: n.type === "comment" || n.type === "reply" || n.type === "bug" ? n.type : "other",
      text: n.message,
      at: n.created_at,
      href: dbHref(n),
      name: n.actor_name ?? "sloptube",
      avatarUrl: n.actor_avatar_url,
      thumb: null,
      read: n.read,
      dbId: n.id,
    })),
    ...uploads.map<Item>((v) => ({
      key: `u:${v.id}`,
      kind: "upload",
      text: `${v.channel.name} uploaded: ${v.title}`,
      at: v.publishedAt,
      href: `/watch?v=${v.id}`,
      name: v.channel.name,
      avatarUrl: v.channel.avatarUrl,
      thumb: v.thumbnail,
      read: null,
      dbId: null,
    })),
  ];
  items.sort((a, b) => parseUtc(b.at) - parseUtc(a.at));
  return items.slice(0, 40);
}

function isUnread(i: Item, seen: number | null): boolean {
  if (i.read !== null) return !i.read;
  return seen === null ? false : parseUtc(i.at) > seen;
}

/**
 * The bell in the top bar: new comments and replies on your videos, replies
 * to your comments, bug report updates, and uploads from channels with the
 * bell on. It lights up (and the badge counts) while something is unread;
 * opening the menu marks everything read. Clicking a comment jumps to it.
 */
export function NotificationsBell() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [seen, setSeen] = useState<number | null>(null);
  const [seenAtOpen, setSeenAtOpen] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [ring, setRing] = useState(false);
  const lastUnread = useRef(0);

  const refresh = useCallback(async () => {
    const list = await fetchAll();
    setItems(list);
    setNow(Date.now());
    return list;
  }, []);

  useEffect(() => {
    // First visit in this browser: older uploads don't count as new.
    const stored = readSeen();
    if (stored === null) {
      const t = Date.now();
      writeSeen(t);
      setSeen(t);
    } else {
      setSeen(stored);
    }
    void refresh();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  const unread = items ? items.filter((i) => isUnread(i, seen)).length : 0;
  const badge = badgeLabel(unread);

  useEffect(() => {
    if (unread > lastUnread.current) setRing(true);
    lastUnread.current = unread;
  }, [unread]);

  function opened() {
    setSeenAtOpen(seen);
    const stamp = Date.now();
    writeSeen(stamp);
    setSeen(stamp);
    const ids = (items ?? []).filter((i) => i.dbId && i.read === false).map((i) => i.dbId!);
    if (ids.length > 0) {
      void supabase.rpc("mark_notifications_read", { ids }).then(() => {
        setItems((list) => list?.map((i) => (i.dbId && ids.includes(i.dbId) ? { ...i, read: true } : i)) ?? null);
      });
    }
  }

  return (
    <Menu
      label={badge ? `Notifications, ${unread} new` : "Notifications"}
      width={480}
      onOpen={opened}
      buttonClassName={`relative grid h-10 w-10 place-items-center rounded-full hover:bg-hover ${unread > 0 ? "text-[var(--link)]" : "text-icon"}`}
      button={
        <>
          <span className={`inline-flex ${ring ? "anim-ring" : ""}`} onAnimationEnd={() => setRing(false)}>
            <BellIcon className="h-6 w-6" />
          </span>
          {badge && (
            <span
              data-bell-badge={badge}
              className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-red px-1 text-center text-[11px] font-medium leading-4 text-white"
            >
              {badge}
            </span>
          )}
        </>
      }
    >
      {(close) => (
        <div data-notifications={items ? items.length : "loading"}>
          <div className="flex h-12 items-center border-b border-divider px-4 text-[16px] leading-[22px] text-text">
            Notifications
          </div>
          <div className="max-h-[min(640px,calc(100dvh-140px))] overflow-y-auto">
            {!items && (
              <div aria-hidden className="space-y-3 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="h-12 w-12 shrink-0 rounded-full bg-skeleton" />
                    <span className="h-4 flex-1 bg-skeleton" />
                  </div>
                ))}
              </div>
            )}
            {items && items.length === 0 && (
              <div className="flex flex-col items-center px-8 py-12 text-center">
                <BellIcon className="h-[72px] w-[72px] text-text-3" />
                <p className="mt-4 text-[16px] font-medium text-text">Your notifications live here</p>
                <p className="mt-2 text-[14px] leading-5 text-text-2">
                  New comments on your videos, replies to you, and uploads from channels with the bell on show up here.
                </p>
              </div>
            )}
            {items?.map((i) => {
              const fresh = i.read !== null ? !i.read || (seenAtOpen !== null && parseUtc(i.at) > seenAtOpen) : seenAtOpen !== null && parseUtc(i.at) > seenAtOpen;
              return (
                <Link
                  key={i.key}
                  href={i.href}
                  onClick={close}
                  role="menuitem"
                  data-notification={i.key}
                  data-kind={i.kind}
                  data-unread={fresh ? "1" : undefined}
                  className="anim-fade-in relative flex items-start gap-4 py-4 pl-8 pr-4 hover:bg-hover"
                >
                  {fresh && <span aria-hidden className="absolute left-3 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-[var(--link)]" />}
                  <Avatar name={i.name} url={i.avatarUrl} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-3 text-[14px] leading-5 text-text">{i.text}</span>
                    <span className="mt-1 block text-[13px] leading-[18px] text-text-2">{timeAgo(i.at, now || Date.now())}</span>
                  </span>
                  {i.thumb && (
                    <span className="relative h-12 w-[86px] shrink-0 overflow-hidden rounded-sm bg-skeleton">
                      <Thumb src={i.thumb} alt="" sizes="86px" />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </Menu>
  );
}

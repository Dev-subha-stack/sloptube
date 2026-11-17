"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bannerPick, KIND_LABEL, type Announcement } from "@/lib/announcements/rules";
import { CampaignIcon, CloseSmallIcon } from "../icons";

const KEY = "sloptube-dismissed-announcements";

function readDismissed(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

/** The site-wide banner under the top bar: the newest announcement, until it is closed. */
export function AnnouncementBanner() {
  const [shown, setShown] = useState<Announcement | null>(null);

  useEffect(() => {
    let live = true;
    void supabase
      .from("announcements")
      .select("id, title, body, kind, link, active, created_at")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (live) setShown(bannerPick((data ?? []) as Announcement[], readDismissed()));
      });
    return () => {
      live = false;
    };
  }, []);

  if (!shown) return null;

  function close() {
    if (!shown) return;
    const d = readDismissed();
    d.add(shown.id);
    try {
      localStorage.setItem(KEY, JSON.stringify([...d].slice(-50)));
    } catch {
      // Storage full or blocked: it just shows again next visit.
    }
    setShown(null);
  }

  const external = shown.link?.startsWith("https://");
  return (
    <div role="region" aria-label="Announcement" data-announcement-banner={shown.id} className="announce-banner border-b border-divider bg-surface">
      <div className="mx-auto flex max-w-[1400px] items-start gap-3 px-4 py-2.5 sm:items-center sm:px-6">
        <CampaignIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--link)] sm:mt-0" />
        <div className="min-w-0 flex-1 text-[13px] leading-5 text-text">
          <span className="mr-2 rounded-[2px] bg-[var(--hover)] px-1.5 py-0.5 text-[11px] font-medium uppercase text-text-2">{KIND_LABEL[shown.kind] ?? "Update"}</span>
          <span className="font-medium">{shown.title}</span>
          {shown.body && <span className="text-text-2"> · {shown.body.length > 140 ? `${shown.body.slice(0, 140)}…` : shown.body}</span>}{" "}
          {shown.link &&
            (external ? (
              <a href={shown.link} target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--link)] hover:underline">
                Learn more
              </a>
            ) : (
              <Link href={shown.link} className="font-medium text-[var(--link)] hover:underline">
                Learn more
              </Link>
            ))}{" "}
          <Link href="/updates" className="whitespace-nowrap text-text-2 hover:underline">
            All updates
          </Link>
        </div>
        <button type="button" onClick={close} aria-label="Close announcement" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-icon hover:bg-hover">
          <CloseSmallIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emojiUrl, splitEmojis } from "@/lib/emojis/rules";

const EmojiMap = createContext<ReadonlyMap<string, string>>(new Map());
const cache = new Map<string, Map<string, string>>();

/** The custom emojis of a video's channel, for the comments under it. */
export function EmojiProvider({ videoId, children }: { videoId: string; children: ReactNode }) {
  const [map, setMap] = useState<Map<string, string>>(() => cache.get(videoId) ?? new Map());
  useEffect(() => {
    let live = true;
    void supabase.rpc("video_emojis", { target_video: videoId }).then(({ data }) => {
      const next = new Map(((data ?? []) as { name: string; image_path: string }[]).map((e) => [e.name, emojiUrl(e.image_path)]));
      cache.set(videoId, next);
      if (live) setMap(next);
    });
    return () => {
      live = false;
    };
  }, [videoId]);
  return <EmojiMap.Provider value={map}>{children}</EmojiMap.Provider>;
}

export function useEmojis(): ReadonlyMap<string, string> {
  return useContext(EmojiMap);
}

/** Text with the channel's :name: emojis drawn as small pictures. */
export function EmojiText({ text }: { text: string }) {
  const map = useEmojis();
  return (
    <>
      {splitEmojis(text, map).map((p, i) =>
        typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={p.url} alt={`:${p.name}:`} title={`:${p.name}:`} className="inline-block h-6 w-6 align-text-bottom" loading="lazy" data-emoji={p.name} />
        ),
      )}
    </>
  );
}

/** A smiley button that opens the channel's emojis; picking one adds :name: to the text. */
export function EmojiPicker({ onPick }: { onPick: (code: string) => void }) {
  const map = useEmojis();
  const [open, setOpen] = useState(false);
  if (map.size === 0) return null;
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Channel emojis"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="grid h-9 w-9 place-items-center rounded-full text-icon hover:bg-hover"
        data-emoji-button
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-10 z-30 grid w-[248px] grid-cols-6 gap-1 rounded-[8px] bg-[var(--menu)] p-2 shadow-lg ring-1 ring-divider" role="menu" data-emoji-menu>
          {[...map.entries()].map(([name, url]) => (
            <button
              key={name}
              type="button"
              role="menuitem"
              title={`:${name}:`}
              onClick={() => {
                onPick(`:${name}:`);
                setOpen(false);
              }}
              className="grid h-9 w-9 place-items-center rounded hover:bg-hover"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`:${name}:`} className="h-7 w-7" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

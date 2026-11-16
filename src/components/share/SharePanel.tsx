"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/integrations/supabase/client";

type Person = { shared_user_id: string; shared_username: string; shared_display_name: string; shared_avatar_url: string | null };

const ERRORS: Record<string, string> = {
  user_not_found: "Nobody with that username. Check the spelling.",
  not_allowed: "That's you. You can always watch your own videos.",
  too_many: "A video can be shared with up to 50 people.",
  not_found: "This video can't be shared.",
};

function errorText(message: string | undefined): string {
  const code = Object.keys(ERRORS).find((k) => message?.includes(k));
  return code ? ERRORS[code]! : "That didn't work. Try again.";
}

/**
 * "Share with people you trust": the owner adds usernames, and only those
 * people (signed in) can open the private video's link. They get a notification.
 */
export function SharePanel({ videoId, watchHref, visibility, disabled = false }: { videoId: string; watchHref: string; visibility: string; disabled?: boolean }) {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc("video_shared_with", { target_video: videoId });
    setPeople((data ?? []) as Person[]);
  }, [videoId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function add(e: FormEvent) {
    e.preventDefault();
    const who = name.trim();
    if (!who || busy) return;
    setBusy(true);
    setMessage(null);
    const { data, error } = await supabase.rpc("share_video", { target_video: videoId, person: who });
    setBusy(false);
    if (error) return setMessage({ ok: false, text: errorText(error.message) });
    const added = (data as Person[] | null)?.[0];
    setName("");
    setMessage({ ok: true, text: `Shared with @${added?.shared_username ?? who}. They got a notification with the link.` });
    void refresh();
  }

  async function remove(p: Person) {
    setBusy(true);
    const { error } = await supabase.rpc("unshare_video", { target_video: videoId, person_id: p.shared_user_id });
    setBusy(false);
    if (error) return setMessage({ ok: false, text: errorText(error.message) });
    void refresh();
  }

  async function copy() {
    const link = `${window.location.origin}${watchHref}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", link);
    }
  }

  return (
    <div className="mt-6" data-share-panel>
      <h2 className="mb-1 text-[15px] font-medium text-text">Share with people you trust</h2>
      <p className="mb-3 text-[12px] leading-4 text-text-2">
        {visibility === "private"
          ? "Only the people you add here can open this private video's link, while signed in."
          : visibility === "unlisted"
            ? "Unlisted: anyone with the link can watch. People you add also get a notification with it."
            : "This video is public. People you add get a notification with the link."}
      </p>
      <form onSubmit={add} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Username, like @sroy1_02"
          disabled={disabled}
          aria-label="Username to share with"
          className="min-w-0 flex-1 rounded-[4px] border border-[var(--input-border)] bg-transparent px-3 py-2 text-[14px] text-text outline-none focus:border-[var(--focus)]"
        />
        <button type="submit" disabled={disabled || busy || !name.trim()} className="btn-blue">
          Share
        </button>
      </form>
      {message && (
        <p className={`mt-2 text-[12px] ${message.ok ? "text-text-2" : "text-[var(--error)]"}`} role="status">
          {message.text}
        </p>
      )}
      <ul className="mt-3 divide-y divide-[var(--divider)] rounded-[2px] border border-divider bg-surface" data-shared-people>
        {people === null && <li className="px-3 py-2 text-[13px] text-text-2">Loading...</li>}
        {people?.length === 0 && <li className="px-3 py-2 text-[13px] text-text-2">Not shared with anyone yet.</li>}
        {people?.map((p) => (
          <li key={p.shared_user_id} className="flex items-center gap-2 px-3 py-2" data-shared-person={p.shared_username}>
            <Avatar name={p.shared_display_name || p.shared_username} url={p.shared_avatar_url} size={28} />
            <span className="min-w-0 flex-1 truncate text-[13px] text-text">
              {p.shared_display_name || p.shared_username} <span className="text-text-2">@{p.shared_username}</span>
            </span>
            <button type="button" onClick={() => void remove(p)} disabled={busy} className="text-[12px] font-medium text-[var(--link)]">
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => void copy()} className="btn-text mt-2">
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}

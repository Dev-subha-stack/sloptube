"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ClockIcon, CloseIcon, PlaylistAddIcon } from "@/components/icons";
import { usePlaylists, type PlaylistVisibility } from "@/lib/store/playlists";
import { useSubscriptions } from "@/lib/store/subscriptions";
import { useWatchLater } from "@/lib/store/watchLater";

/** Save to...: Watch later and the person's playlists as checkboxes, plus a new playlist form. */
export function AddToPlaylistModal({ isOpen, videoId, onClose }: { isOpen: boolean; videoId: string; onClose: () => void }) {
  const { mine, loadMine, containing, addVideo, removeVideo, create } = usePlaylists();
  const later = useWatchLater();
  const showToast = useSubscriptions((s) => s.showToast);
  const [inside, setInside] = useState<Set<string> | null>(null);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<PlaylistVisibility>("private");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    void later.load();
    void loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && mine) void containing(videoId).then(setInside);
  }, [isOpen, mine, videoId, containing]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function toggle(id: string) {
    const on = inside?.has(id) ?? false;
    setInside((s) => {
      const next = new Set(s);
      if (on) next.delete(id);
      else next.add(id);
      return next;
    });
    const ok = on ? await removeVideo(id, videoId) : await addVideo(id, videoId);
    const name = mine?.find((p) => p.id === id)?.title ?? "playlist";
    showToast(ok ? (on ? `Removed from ${name}` : `Saved to ${name}`) : "That didn't work. Try again.");
  }

  async function toggleLater() {
    const now = await later.toggle(videoId);
    showToast(now === null ? "That didn't work. Try again." : now ? "Saved to Watch later" : "Removed from Watch later");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    const pl = await create(title, visibility, videoId);
    setBusy(false);
    if (!pl) return showToast("The playlist couldn't be created.");
    setInside((s) => new Set([...(s ?? []), pl.id]));
    setTitle("");
    setCreating(false);
    showToast(`Saved to ${pl.title}`);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div role="dialog" aria-label="Save to" className="w-full max-w-[360px] overflow-hidden rounded-[12px] bg-surface shadow-xl" onClick={(e) => e.stopPropagation()} data-save-dialog>
        <div className="flex items-center justify-between border-b border-divider px-4 py-3">
          <span className="text-[16px] text-text">Save to...</span>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-icon hover:bg-hover">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[300px] overflow-y-auto px-2 py-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2.5 text-[14px] text-text hover:bg-hover">
            <input type="checkbox" checked={later.ids.has(videoId)} onChange={() => void toggleLater()} className="h-4 w-4 accent-[var(--link)]" data-save-later />
            <ClockIcon className="h-5 w-5 text-icon" />
            <span className="flex-1">Watch later</span>
          </label>
          {mine === null && <p className="px-3 py-3 text-[13px] text-text-2">Loading...</p>}
          {mine?.map((pl) => (
            <label key={pl.id} className="flex cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2.5 text-[14px] text-text hover:bg-hover">
              <input type="checkbox" checked={inside?.has(pl.id) ?? false} disabled={inside === null} onChange={() => void toggle(pl.id)} className="h-4 w-4 accent-[var(--link)]" data-save-playlist={pl.title} />
              <span className="min-w-0 flex-1 truncate">{pl.title}</span>
              <span className="text-[11px] capitalize text-text-3">{pl.visibility}</span>
            </label>
          ))}
        </div>
        <div className="border-t border-divider p-3">
          {!creating ? (
            <button type="button" onClick={() => setCreating(true)} className="flex items-center gap-2 px-2 py-1 text-[14px] font-medium text-[var(--link)]">
              <PlaylistAddIcon className="h-5 w-5" />
              Create new playlist
            </button>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150}
                autoFocus
                placeholder="Playlist name"
                aria-label="Playlist name"
                className="w-full rounded-[4px] border border-[var(--input-border)] bg-transparent px-2.5 py-2 text-[14px] text-text outline-none focus:border-[var(--focus)]"
              />
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as PlaylistVisibility)}
                aria-label="Who can see it"
                className="w-full rounded-[4px] border border-[var(--input-border)] bg-surface px-2 py-2 text-[14px] text-text"
              >
                <option value="private">Private (only you)</option>
                <option value="unlisted">Unlisted (anyone with the link)</option>
                <option value="public">Public (on your channel)</option>
              </select>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCreating(false)} className="btn-text">
                  Cancel
                </button>
                <button type="submit" disabled={!title.trim() || busy} className="btn-blue">
                  Create
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

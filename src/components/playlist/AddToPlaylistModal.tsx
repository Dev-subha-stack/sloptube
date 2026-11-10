"use client";

import { useEffect, useState } from "react";
import { CloseIcon, PlaylistAddIcon } from "@/components/icons";
import { usePlaylists } from "@/lib/store/playlists";
import { useSubscriptions } from "@/lib/store/subscriptions";

type Props = {
  isOpen: boolean;
  videoId: string;
  onClose: () => void;
};

export function AddToPlaylistModal({ isOpen, videoId, onClose }: Props) {
  const { playlists, load, addVideo, removeVideo, hasVideo, createPlaylist } = usePlaylists();
  const showToast = useSubscriptions((s) => s.showToast);
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      load();
    }
  }, [isOpen, load]);

  if (!isOpen) return null;

  const handleToggle = (playlistId: string) => {
    const isCurrentlyIn = hasVideo(playlistId, videoId);
    if (isCurrentlyIn) {
      removeVideo(playlistId, videoId);
      showToast("Removed from playlist");
    } else {
      addVideo(playlistId, videoId);
      showToast("Added to playlist");
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const pl = createPlaylist(newTitle.trim(), "", videoId);
    setNewTitle("");
    setShowCreate(false);
    showToast(`Created playlist "${pl.title}"`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-xs">
      <div className="w-full max-w-[360px] rounded-sm bg-surface shadow-xl border border-divider overflow-hidden">
        <div className="flex items-center justify-between border-b border-divider px-4 py-3">
          <span className="text-[16px] font-medium text-text">Save to...</span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-icon hover:bg-hover hover:text-text"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[260px] overflow-y-auto px-2 py-2 divide-y divide-divider/50">
          {playlists.length === 0 ? (
            <p className="px-3 py-4 text-[13px] text-text-2 text-center">No playlists created yet.</p>
          ) : (
            playlists.map((pl) => {
              const checked = hasVideo(pl.id, videoId);
              return (
                <label
                  key={pl.id}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-hover rounded-xs cursor-pointer select-none text-[14px] text-text"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggle(pl.id)}
                    className="h-4 w-4 accent-[var(--link)] rounded-xs cursor-pointer"
                  />
                  <span className="flex-1 truncate">{pl.title}</span>
                  <span className="text-[11px] text-text-3 capitalize">{pl.visibility}</span>
                </label>
              );
            })
          )}
        </div>

        <div className="border-t border-divider p-3 bg-surface">
          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 text-[14px] font-medium text-[var(--link)] hover:underline px-2 py-1"
            >
              <PlaylistAddIcon className="h-5 w-5" />
              <span>Create new playlist</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                placeholder="Enter playlist title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={100}
                autoFocus
                className="w-full h-8 px-2.5 rounded-xs border border-[var(--input-border)] bg-[var(--input-bg)] text-[13px] text-text outline-none focus:border-[var(--focus)]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-2.5 py-1 text-[13px] text-text-2 hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="btn-blue text-[13px] h-7 px-3 disabled:opacity-50"
                >
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

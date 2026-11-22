"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type DragEvent } from "react";
import { DeleteIcon, DragHandleIcon, PlayIcon } from "@/components/icons";
import { Thumb } from "@/components/Thumb";
import { VideoRow } from "@/components/playlist/VideoRow";
import { supabase } from "@/integrations/supabase/client";
import type { FeedCard } from "@/lib/feed/types";
import { playlistCards, usePlaylists, type PlaylistVisibility } from "@/lib/store/playlists";
import { useSession } from "@/lib/store/session";
import { useSubscriptions } from "@/lib/store/subscriptions";
import { formatTime } from "@/lib/watch/format";

type Info = { id: string; owner_id: string; title: string; description: string; visibility: PlaylistVisibility };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** /playlist?list=<id>: one playlist. The owner can reorder, remove, rename and delete. */
export function PlaylistDetailView() {
  const id = useSearchParams().get("list") ?? "";
  const router = useRouter();
  const me = useSession((s) => s.user?.id ?? null);
  const showToast = useSubscriptions((s) => s.showToast);
  const { reorder, removeVideo, update, remove } = usePlaylists();
  const [info, setInfo] = useState<Info | null | undefined>(undefined);
  const [videos, setVideos] = useState<FeedCard[]>([]);
  const [dragged, setDragged] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", visibility: "private" as PlaylistVisibility });

  const reload = useCallback(async () => {
    if (!UUID.test(id)) return setInfo(null);
    const { data } = await supabase.from("playlists").select("id,owner_id,title,description,visibility").eq("id", id).maybeSingle();
    setInfo((data as Info | null) ?? null);
    if (data) setVideos(await playlistCards(id));
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload, me]);

  if (info === undefined) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="mb-6 h-8 w-48 rounded-[4px] bg-skeleton" />
      </div>
    );
  }
  if (info === null) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-16 text-center">
        <p className="text-[18px] text-text">This playlist doesn't exist or is private</p>
        <Link href="/playlists" className="btn-blue mt-4">
          Your playlists
        </Link>
      </div>
    );
  }

  const owner = me === info.owner_id;
  const total = videos.reduce((acc, v) => acc + (v.durationS ?? 0), 0);
  const first = videos[0];

  function drop(e: DragEvent, to: number) {
    e.preventDefault();
    const from = dragged;
    setDragged(null);
    setOver(null);
    if (from === null || from === to) return;
    const next = [...videos];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setVideos(next);
    void reorder(info!.id, next.map((v) => v.id)).then((ok) => showToast(ok ? "Playlist order updated" : "The new order wasn't saved"));
  }

  return (
    <div className="mx-auto max-w-[1500px] px-3 py-6 sm:px-6" data-playlist-view={info.id}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="h-fit rounded-[16px] bg-surface-2 p-5 lg:sticky lg:top-20">
          <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-[12px] bg-black">
            {first ? <Thumb src={first.thumbnail} alt={info.title} /> : <div className="grid h-full place-items-center text-text-3">Empty playlist</div>}
          </div>
          {editing ? (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!draft.title.trim()) return;
                const ok = await update(info.id, { title: draft.title.trim().slice(0, 150), description: draft.description.slice(0, 5000), visibility: draft.visibility });
                showToast(ok ? "Playlist saved" : "The changes weren't saved");
                setEditing(false);
                void reload();
              }}
            >
              <input aria-label="Playlist name" value={draft.title} maxLength={150} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="w-full rounded-[4px] border border-[var(--input-border)] bg-transparent px-2.5 py-2 text-[15px] text-text" />
              <textarea aria-label="Description" value={draft.description} maxLength={5000} rows={3} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="w-full rounded-[4px] border border-[var(--input-border)] bg-transparent px-2.5 py-2 text-[13px] text-text" />
              <select aria-label="Who can see it" value={draft.visibility} onChange={(e) => setDraft({ ...draft, visibility: e.target.value as PlaylistVisibility })} className="w-full rounded-[4px] border border-[var(--input-border)] bg-surface px-2 py-2 text-[13px] text-text">
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </select>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-text" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-blue">
                  Save
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="text-[22px] font-bold leading-7 text-text">{info.title}</h1>
              {info.description && <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-text-2">{info.description}</p>}
              <p className="mt-3 text-[12px] text-text-3">
                {videos.length} videos · {formatTime(total)} · <span className="capitalize">{info.visibility}</span>
              </p>
            </>
          )}
          {first && (
            <Link href={`/watch?v=${first.id}`} className="btn-blue mt-5 flex w-full items-center justify-center gap-2">
              <PlayIcon className="h-5 w-5" /> Play all
            </Link>
          )}
          {owner && !editing && (
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn-text flex-1" onClick={() => (setDraft({ title: info.title, description: info.description, visibility: info.visibility }), setEditing(true))}>
                Edit
              </button>
              <button
                type="button"
                className="btn-text flex-1 text-[var(--error)]"
                onClick={async () => {
                  if (!window.confirm(`Delete the playlist "${info.title}"? The videos stay; only the list is removed.`)) return;
                  if (await remove(info.id)) {
                    showToast("Playlist deleted");
                    router.push("/playlists");
                  }
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="min-w-0">
          {owner && videos.length > 1 && <p className="border-b border-divider pb-3 text-[13px] text-text-2">Drag a video by its handle to reorder</p>}
          {videos.length === 0 ? (
            <div className="py-16 text-center text-text-2">No videos in this playlist yet.</div>
          ) : (
            videos.map((v, i) => (
              <div
                key={v.id}
                draggable={owner}
                onDragStart={(e) => (setDragged(i), (e.dataTransfer.effectAllowed = "move"))}
                onDragOver={(e) => (e.preventDefault(), over !== i && setOver(i))}
                onDragEnd={() => (setDragged(null), setOver(null))}
                onDrop={(e) => drop(e, i)}
                className={`${dragged === i ? "opacity-30" : ""} ${over === i && dragged !== null ? "border-t-2 border-[var(--link)]" : ""}`}
              >
                <VideoRow
                  video={v}
                  index={i}
                  href={`/watch?v=${v.id}`}
                  handle={owner ? <DragHandleIcon className="h-5 w-5 shrink-0 cursor-grab text-icon" aria-hidden /> : undefined}
                  actions={
                    owner ? (
                      <button
                        type="button"
                        aria-label={`Remove ${v.title} from playlist`}
                        className="press grid h-9 w-9 shrink-0 place-items-center rounded-full text-icon hover:bg-[var(--active)] hover:text-[var(--error)]"
                        onClick={async () => {
                          setVideos((list) => list.filter((x) => x.id !== v.id));
                          showToast((await removeVideo(info.id, v.id)) ? `Removed "${v.title}"` : "That didn't work");
                        }}
                      >
                        <DeleteIcon className="h-5 w-5" />
                      </button>
                    ) : undefined
                  }
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

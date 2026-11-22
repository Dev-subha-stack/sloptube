import Link from "next/link";
import { PlaylistAddIcon } from "@/components/icons";
import { Thumb } from "@/components/Thumb";
import type { PlaylistSummary } from "@/lib/store/playlists";

/** A playlist tile: cover with the video count, title and visibility. */
export function PlaylistCard({ playlist, showVisibility = false }: { playlist: PlaylistSummary; showVisibility?: boolean }) {
  return (
    <Link href={`/playlist?list=${playlist.id}`} className="group block min-w-0" data-playlist-card={playlist.title}>
      <div className="card-thumb relative aspect-video w-full overflow-hidden rounded-[12px] bg-skeleton">
        {playlist.cover ? (
          <Thumb src={playlist.cover} alt="" sizes="(min-width: 1024px) 25vw, 50vw" />
        ) : (
          <div className="grid h-full place-items-center text-[13px] text-text-3">No videos yet</div>
        )}
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-[4px] bg-black/80 px-1.5 py-[2px] text-[12px] font-medium text-white">
          <PlaylistAddIcon className="h-4 w-4" />
          {playlist.videoCount} {playlist.videoCount === 1 ? "video" : "videos"}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-[14px] font-medium leading-5 text-text">{playlist.title}</h3>
      <p className="mt-0.5 text-[12px] text-text-2">{showVisibility ? <span className="capitalize">{playlist.visibility}</span> : "View full playlist"}</p>
    </Link>
  );
}

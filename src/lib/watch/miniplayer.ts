export type MiniPos = { x: number; y: number };

export type MiniDockSlice<TPlayer> = {
  player: TPlayer | null;
  mini: boolean;
  miniPos: MiniPos | null;
};

/** Autoplay only navigates to /watch when the player is NOT in miniplayer mode. */
export function shouldNavigateOnAutoplay(mini: boolean): boolean {
  return !mini;
}

/** Pick the next unwatched video id for autoplay, skipping the current video. */
export function pickNextAutoplayId(currentId: string, nextVideoIds: string[], watched: ReadonlySet<string>): string | null {
  for (const candidate of nextVideoIds) {
    if (candidate && candidate !== currentId && !watched.has(candidate)) return candidate;
  }
  return null;
}

/**
 * Swap the active miniplayer video in place.
 * Keeps mini=true and preserves miniPos; ignores stale swaps if the user already
 * closed or expanded the miniplayer before the next video finished loading.
 */
export function nextDockStateOnSwap<TPlayer>(
  state: MiniDockSlice<TPlayer>,
  nextPlayer: TPlayer,
): MiniDockSlice<TPlayer> {
  if (!state.mini || !state.player) return state;
  return { ...state, player: nextPlayer, mini: true };
}
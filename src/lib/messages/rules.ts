// Direct message rules shared by the browser and the tests. No imports.

export const DM_MAX = 2000;

/** The reactions people can put on a message (one each; the database checks the same list). */
export const DM_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;

/** Trimmed text ready to send, or an error message. */
export function dmProblem(body: string): string | null {
  const t = body.trim();
  if (!t) return "Write a message first.";
  if (t.length > DM_MAX) return `Messages can be at most ${DM_MAX} characters.`;
  return null;
}

export type ReactionChip = { emoji: string; count: number; mine: boolean };

/** Reactions on one message (user id -> emoji), grouped for display in the fixed order. */
export function reactionChips(reactions: Record<string, string> | null | undefined, me: string | null | undefined): ReactionChip[] {
  const all = Object.entries(reactions ?? {});
  return DM_REACTIONS.flatMap((emoji) => {
    const who = all.filter(([, e]) => e === emoji);
    return who.length ? [{ emoji, count: who.length, mine: who.some(([id]) => id === me) }] : [];
  });
}

/** What clicking an emoji does: picking your current reaction again removes it. */
export function nextReaction(current: string | null | undefined, picked: string): string | null {
  return current === picked ? null : picked;
}

export function dmErrorText(message: string): string {
  if (message.includes("dm_rate_limited")) return "You're sending messages too fast. Wait a minute.";
  if (message.includes("row-level security")) return "You can't message this account.";
  if (message.includes("direct_messages_not_self")) return "You can't message yourself.";
  if (message.includes("dm_not_yours")) return "You can only change your own messages.";
  if (message.includes("dm_empty")) return "Write a message first.";
  if (message.includes("dm_too_long")) return `Messages can be at most ${DM_MAX} characters.`;
  if (message.includes("dm_not_found")) return "That message is gone.";
  return "The message didn't send. Try again.";
}

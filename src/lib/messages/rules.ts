// Direct message rules shared by the browser and the tests. No imports.

export const DM_MAX = 2000;

/** Trimmed text ready to send, or an error message. */
export function dmProblem(body: string): string | null {
  const t = body.trim();
  if (!t) return "Write a message first.";
  if (t.length > DM_MAX) return `Messages can be at most ${DM_MAX} characters.`;
  return null;
}

export function dmErrorText(message: string): string {
  if (message.includes("dm_rate_limited")) return "You're sending messages too fast. Wait a minute.";
  if (message.includes("row-level security")) return "You can't message this account.";
  if (message.includes("direct_messages_not_self")) return "You can't message yourself.";
  return "The message didn't send. Try again.";
}

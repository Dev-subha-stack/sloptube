// Bug report statuses as people see them. No imports, so tests can load it directly.
export type BugStatus = "pending" | "in_review" | "resolved" | "dismissed";

export const BUG_STATUSES: BugStatus[] = ["pending", "in_review", "resolved", "dismissed"];

export function bugStatusLabel(s: string): string {
  switch (s) {
    case "in_review":
      return "Checked / in review";
    case "resolved":
      return "Fixed";
    case "dismissed":
      return "Closed";
    default:
      return "Pending";
  }
}

/** Badge colours as theme tokens: grey pending, blue in review, green fixed, muted closed. */
export function bugStatusTone(s: string): string {
  switch (s) {
    case "in_review":
      return "bg-[var(--badge-admin)] text-[var(--badge-text)]";
    case "resolved":
      return "bg-[var(--badge-mod)] text-[var(--badge-text)]";
    case "dismissed":
      return "bg-[var(--active)] text-text-2";
    default:
      return "bg-[var(--hover)] text-text";
  }
}

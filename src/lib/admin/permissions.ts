// Staff powers. Keep in step with custom_roles.permissions and has_permission() in the database.
// No imports, so tests can load it directly.

export const PERMISSIONS = [
  { key: "view_users", label: "See all users" },
  { key: "ban_users", label: "Ban and unban users" },
  { key: "edit_usernames", label: "Change usernames" },
  { key: "manage_videos", label: "Search and delete videos" },
  { key: "manage_comments", label: "Hide and remove comments" },
  { key: "manage_reports", label: "Handle reports" },
  { key: "manage_bugs", label: "Handle bug reports" },
  { key: "manage_suggestions", label: "Handle suggestions" },
  { key: "manage_words", label: "Edit the blocked word list" },
  { key: "view_log", label: "See the mod log" },
  { key: "read_messages", label: "Read contact messages" },
  { key: "post_announcements", label: "Post announcements" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];

/** Built-in moderators: what they could always do. Admins have everything. */
export const MODERATOR_PERMISSIONS: readonly Permission[] = ["manage_bugs", "manage_suggestions", "manage_comments"];

/** Which power opens each admin tab. Roles is admins only. */
export const TAB_PERMISSION: Record<string, Permission | "admin"> = {
  users: "view_users",
  roles: "admin",
  videos: "manage_videos",
  announcements: "post_announcements",
  bugs: "manage_bugs",
  suggestions: "manage_suggestions",
  comments: "manage_comments",
  queue: "manage_reports",
  log: "view_log",
  words: "manage_words",
  messages: "read_messages",
};

export function canOpenTab(tab: string, perms: ReadonlySet<string>, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  const need = TAB_PERMISSION[tab];
  if (!need || need === "admin") return false;
  return perms.has(need);
}

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function roleProblem(name: string, color: string): string | null {
  const n = name.trim();
  if (!n) return "Give the role a name.";
  if (n.length > 30) return "Role names can be up to 30 characters.";
  if (!HEX_COLOR.test(color)) return "Pick a colour.";
  return null;
}

/** Black or white text, whichever reads better on the badge colour. */
export function badgeTextColor(hex: string): "#000000" | "#ffffff" {
  if (!HEX_COLOR.test(hex)) return "#ffffff";
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return lum > 0.4 ? "#000000" : "#ffffff";
}

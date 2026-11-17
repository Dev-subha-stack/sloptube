// Site announcements: kinds, labels, limits and which one the banner shows.
// No imports, so tests can load it directly.

export const ANNOUNCEMENT_KINDS = ["update", "feature", "fix", "maintenance"] as const;
export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number];

export const KIND_LABEL: Record<AnnouncementKind, string> = {
  update: "Update",
  feature: "New feature",
  fix: "Bug fix",
  maintenance: "Maintenance",
};

export const TITLE_MAX = 120;
export const BODY_MAX = 2000;

export type Announcement = {
  id: string;
  title: string;
  body: string;
  kind: AnnouncementKind;
  link: string | null;
  active: boolean;
  created_at: string;
};

/** A link must be a full https address or a page on this site. */
export function linkProblem(link: string): string | null {
  const l = link.trim();
  if (!l) return null;
  if (l.startsWith("/") && !l.startsWith("//")) return null;
  if (/^https:\/\/[^\s]+$/i.test(l)) return null;
  return "Links must start with https:// or /";
}

export function announcementProblem(title: string, body: string, link: string): string | null {
  if (!title.trim()) return "Give the announcement a title.";
  if (title.trim().length > TITLE_MAX) return `Titles can be up to ${TITLE_MAX} characters.`;
  if (body.length > BODY_MAX) return `Messages can be up to ${BODY_MAX} characters.`;
  return linkProblem(link);
}

/** The banner shows the newest live announcement the person has not closed. */
export function bannerPick(list: readonly Announcement[], dismissed: ReadonlySet<string>): Announcement | null {
  const live = list.filter((a) => a.active && !dismissed.has(a.id));
  live.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return live[0] ?? null;
}

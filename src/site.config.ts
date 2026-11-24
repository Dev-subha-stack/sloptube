// The owner's details for the public pages (/about, /terms, /privacy,
// /guidelines, /press, /contact), the footer and the share cards.
//
// The owner name and contact email are configured below. Set the governing
// jurisdiction before relying on the Terms of Service as a final legal notice.
// Nothing here is secret: these details are displayed on the public site.
//
// No imports on purpose, so node --test can load it directly.

export const siteConfig = {
  /** The site's name in titles, share cards and the footer. */
  siteName: "sloptube",
  /** The person or organization that runs this copy of sloptube, as it should appear in the terms. */
  ownerName: "sroy1_0",
  /** Where people (and the press) can write. Also shown on /contact next to the form. */
  contactEmail: "romendraroy4@gmail.com",
  /** The country or state whose law the terms follow; complete this before launch. */
  jurisdiction: "JURISDICTION",
  /** The date the terms and the privacy notice were last revised, shown at the top of both. */
  legalUpdated: "24 November 2026",
  /** One line about the site, for share cards and search results. */
  description: "A video platform, built in the open one feature at a time.",
  /** The source code, linked from the footer and /about. */
  sourceUrl: "https://github.com/Dev-subha-stack/sloptube",
} as const;

export type SiteConfig = typeof siteConfig;

/** True while a value is still the placeholder, so the pages can mark it. */
export function isPlaceholder(value: string): boolean {
  return /^[A-Z_]+$/.test(value);
}

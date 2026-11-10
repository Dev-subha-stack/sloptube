export type Chapter = {
  time: number; // in seconds
  title: string;
  formattedTime: string;
};

/**
 * Parses timestamps and titles from description text.
 * Matches lines like:
 * "00:00 - Introduction"
 * "1:30 Meet the Team"
 * "01:04:20 - Finale"
 */
export function parseChapters(description: string, durationS?: number | null): Chapter[] {
  if (!description) return [];
  const lines = description.split(/\r?\n/);
  const regex = /(?:(?:(\d{1,2}):)?(\d{1,2}):(\d{2}))\s*[-–—:]?\s*(.+)/;
  const chapters: Chapter[] = [];

  for (const line of lines) {
    const match = line.trim().match(regex);
    if (!match) continue;

    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const title = match[4].trim();

    if (minutes >= 60 || seconds >= 60) continue;
    const time = hours * 3600 + minutes * 60 + seconds;

    const formattedTime = hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${minutes}:${String(seconds).padStart(2, "0")}`;

    chapters.push({ time, title, formattedTime });
  }

  // Sort by time
  chapters.sort((a, b) => a.time - b.time);
  return chapters;
}

/**
 * Returns the current active chapter given playback time.
 */
export function activeChapterAt(chapters: Chapter[], currentTime: number): Chapter | null {
  if (!chapters.length) return null;
  let active = chapters[0];
  for (const c of chapters) {
    if (currentTime >= c.time) {
      active = c;
    } else {
      break;
    }
  }
  return active;
}

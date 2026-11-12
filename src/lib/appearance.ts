// Look-and-feel choices kept in this browser: accent colour, compact layout,
// fewer animations, and the player's default size. No imports, so the head
// script below can run before the first paint.

export const APPEARANCE_KEY = "sloptube-appearance";

export type Accent = "red" | "blue" | "green" | "purple" | "orange";
export type Appearance = { accent: Accent; compact: boolean; reducedMotion: boolean };

export const DEFAULT_APPEARANCE: Appearance = { accent: "red", compact: false, reducedMotion: false };
export const ACCENTS: Accent[] = ["red", "blue", "green", "purple", "orange"];

export function parseAppearance(raw: string | null): Appearance {
  try {
    const v = JSON.parse(raw ?? "{}") as Partial<Appearance>;
    return {
      accent: ACCENTS.includes(v.accent as Accent) ? (v.accent as Accent) : "red",
      compact: v.compact === true,
      reducedMotion: v.reducedMotion === true,
    };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function applyAppearance(a: Appearance, save = true) {
  const el = document.documentElement;
  if (a.accent === "red") delete el.dataset.accent;
  else el.dataset.accent = a.accent;
  if (a.compact) el.dataset.density = "compact";
  else delete el.dataset.density;
  if (a.reducedMotion) el.dataset.motion = "reduced";
  else delete el.dataset.motion;
  if (!save) return;
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(a));
  } catch {
    // Storage blocked: applies for this page only.
  }
}

/** Runs in <head> before paint so the chosen look never flashes. */
export const appearanceScript = `try{var a=JSON.parse(localStorage.getItem("${APPEARANCE_KEY}")||"{}"),d=document.documentElement;if(a.accent&&a.accent!=="red")d.dataset.accent=a.accent;if(a.compact)d.dataset.density="compact";if(a.reducedMotion)d.dataset.motion="reduced"}catch(e){}`;

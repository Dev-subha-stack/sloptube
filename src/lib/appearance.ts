// Look-and-feel choices kept in this browser: accent colour, compact layout,
// fewer animations, and the player's default size. No imports, so the head
// script below can run before the first paint.

export const APPEARANCE_KEY = "sloptube-appearance";

export type Accent = "red" | "blue" | "green" | "purple" | "orange";
export type Background = "default" | "ocean" | "sunset" | "aurora";
export type FontChoice = "default" | "clean" | "rounded" | "mono" | "serif";
export type FontSize = "sm" | "md" | "lg";
export type CornerRadius = "sharp" | "classic" | "rounded" | "pill";

export type Appearance = {
  accent: Accent;
  customAccent: string | null;
  compact: boolean;
  reducedMotion: boolean;
  background: Background;
  customBackground: string | null;
  font: FontChoice;
  fontSize: FontSize;
  radius: CornerRadius;
};

export const DEFAULT_APPEARANCE: Appearance = {
  accent: "red",
  customAccent: null,
  compact: false,
  reducedMotion: false,
  background: "default",
  customBackground: null,
  font: "default",
  fontSize: "md",
  radius: "classic",
};
export const ACCENTS: Accent[] = ["red", "blue", "green", "purple", "orange"];
export const BACKGROUNDS: Background[] = ["default", "ocean", "sunset", "aurora"];
export const FONTS: FontChoice[] = ["default", "clean", "rounded", "mono", "serif"];
export const FONT_SIZES: FontSize[] = ["sm", "md", "lg"];
export const RADII: CornerRadius[] = ["sharp", "classic", "rounded", "pill"];

const HEX = /^#[0-9a-fA-F]{6}$/;
export function validHex(value: unknown): string | null {
  return typeof value === "string" && HEX.test(value) ? value.toLowerCase() : null;
}

export function parseAppearance(raw: string | null): Appearance {
  try {
    const v = JSON.parse(raw ?? "{}") as Partial<Appearance>;
    return {
      accent: ACCENTS.includes(v.accent as Accent) ? (v.accent as Accent) : "red",
      customAccent: validHex(v.customAccent),
      compact: v.compact === true,
      reducedMotion: v.reducedMotion === true,
      background: BACKGROUNDS.includes(v.background as Background) ? (v.background as Background) : "default",
      customBackground: validHex(v.customBackground),
      font: FONTS.includes(v.font as FontChoice) ? (v.font as FontChoice) : "default",
      fontSize: FONT_SIZES.includes(v.fontSize as FontSize) ? (v.fontSize as FontSize) : "md",
      radius: RADII.includes(v.radius as CornerRadius) ? (v.radius as CornerRadius) : "classic",
    };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function applyAppearance(a: Appearance, save = true) {
  const el = document.documentElement;
  if (a.customAccent) {
    el.dataset.accent = "custom";
    el.style.setProperty("--custom-accent", a.customAccent);
  } else {
    el.style.removeProperty("--custom-accent");
    if (a.accent === "red") delete el.dataset.accent;
    else el.dataset.accent = a.accent;
  }
  if (a.compact) el.dataset.density = "compact";
  else delete el.dataset.density;
  if (a.reducedMotion) el.dataset.motion = "reduced";
  else delete el.dataset.motion;
  if (a.customBackground) {
    el.dataset.background = "custom";
    el.style.setProperty("--custom-bg", a.customBackground);
  } else {
    el.style.removeProperty("--custom-bg");
    if (a.background === "default") delete el.dataset.background;
    else el.dataset.background = a.background;
  }
  if (a.font === "default") delete el.dataset.font;
  else el.dataset.font = a.font;
  if (a.fontSize === "md") delete el.dataset.fontSize;
  else el.dataset.fontSize = a.fontSize;
  if (a.radius === "classic") delete el.dataset.radius;
  else el.dataset.radius = a.radius;
  if (!save) return;
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(a));
  } catch {
    // Storage blocked: applies for this page only.
  }
}

/** Runs in <head> before paint so the chosen look never flashes. */
export const appearanceScript = `try{var a=JSON.parse(localStorage.getItem("${APPEARANCE_KEY}")||"{}"),d=document.documentElement,h=/^#[0-9a-fA-F]{6}$/;if(h.test(a.customAccent||"")){d.dataset.accent="custom";d.style.setProperty("--custom-accent",a.customAccent)}else if(a.accent&&a.accent!=="red"){d.dataset.accent=a.accent}if(a.compact)d.dataset.density="compact";if(a.reducedMotion)d.dataset.motion="reduced";if(h.test(a.customBackground||"")){d.dataset.background="custom";d.style.setProperty("--custom-bg",a.customBackground)}else if(a.background&&a.background!=="default"){d.dataset.background=a.background}if(a.font&&a.font!=="default")d.dataset.font=a.font;if(a.fontSize&&a.fontSize!=="md")d.dataset.fontSize=a.fontSize;if(a.radius&&a.radius!=="classic")d.dataset.radius=a.radius}catch(e){}`;

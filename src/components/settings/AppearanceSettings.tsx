"use client";

import { useEffect, useState } from "react";
import {
  ACCENTS,
  APPEARANCE_KEY,
  BACKGROUNDS,
  DEFAULT_APPEARANCE,
  FONTS,
  FONT_SIZES,
  RADII,
  applyAppearance,
  parseAppearance,
  type Accent,
  type Appearance,
  type Background,
  type CornerRadius,
  type FontChoice,
  type FontSize,
} from "@/lib/appearance";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";

const ACCENT_LABEL: Record<Accent, string> = { red: "Red", blue: "Blue", green: "Green", purple: "Purple", orange: "Orange" };
const BACKGROUND_LABEL: Record<Background, string> = { default: "Default", ocean: "Ocean", sunset: "Sunset", aurora: "Aurora" };
const FONT_LABEL: Record<FontChoice, string> = { default: "Default", clean: "Clean Sans", rounded: "Rounded", mono: "Monospace", serif: "Serif" };
const SIZE_LABEL: Record<FontSize, string> = { sm: "Small", md: "Normal", lg: "Large" };
const RADIUS_LABEL: Record<CornerRadius, string> = { sharp: "Sharp", classic: "Classic", rounded: "Rounded", pill: "Extra round" };

/** Settings > Appearance: theme, accent colour, compact layout and animations. Saved in this browser. */
export function AppearanceSettings() {
  const [a, setA] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setA(parseAppearance(localStorage.getItem(APPEARANCE_KEY)));
    setTheme(readTheme());
  }, []);

  function update(next: Partial<Appearance>) {
    const merged = { ...a, ...next };
    setA(merged);
    applyAppearance(merged);
  }

  function resetAll() {
    setA(DEFAULT_APPEARANCE);
    applyAppearance(DEFAULT_APPEARANCE);
    setTheme("light");
    applyTheme("light");
  }

  return (
    <section id="appearance" data-appearance className="mt-8 border-t border-divider pt-6 md:grid md:grid-cols-[220px_1fr] md:gap-8">
      <div>
        <h2 className="text-[16px] font-medium text-text">Appearance</h2>
        <p className="mt-1 text-[13px] text-text-2">How sloptube looks in this browser.</p>
        <button
          type="button"
          onClick={resetAll}
          data-appearance-reset
          className="mt-3 rounded-full border border-divider px-3 py-1 text-[12px] text-text-2 hover:bg-hover hover:text-text"
        >
          Reset to defaults
        </button>
      </div>
      <div className="mt-4 space-y-5 md:mt-0">
        <div>
          <p className="text-[13px] text-text-2">Theme</p>
          <div className="mt-2 flex gap-2">
            {(["light", "dark"] as Theme[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={theme === t}
                onClick={() => {
                  setTheme(t);
                  applyTheme(t);
                }}
                className={`rounded-full border px-4 py-1.5 text-[14px] ${theme === t ? "border-[var(--link)] text-[var(--link)]" : "border-divider text-text"}`}
              >
                {t === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[13px] text-text-2">Accent colour</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {ACCENTS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={!a.customAccent && a.accent === c}
                aria-label={ACCENT_LABEL[c]}
                title={ACCENT_LABEL[c]}
                onClick={() => update({ accent: c, customAccent: null })}
                data-accent-swatch={c}
                className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-[var(--surface)] ${!a.customAccent && a.accent === c ? "ring-2 ring-[var(--text)]" : ""}`}
                style={{ background: `var(--accent-${c})` }}
              />
            ))}
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-divider px-3 py-1 text-[12px] text-text">
              <input
                type="color"
                aria-label="Custom accent colour"
                data-custom-accent
                value={a.customAccent ?? "#cc0000"}
                onChange={(e) => update({ customAccent: e.target.value })}
                className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
              />
              <span>{a.customAccent ? a.customAccent : "Custom"}</span>
            </label>
          </div>
        </div>
        <div>
          <p className="text-[13px] text-text-2">Page background</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {BACKGROUNDS.map((background) => (
              <button
                key={background}
                type="button"
                aria-pressed={!a.customBackground && a.background === background}
                onClick={() => update({ background, customBackground: null })}
                className={`rounded-full border px-3 py-1.5 text-[13px] ${!a.customBackground && a.background === background ? "border-[var(--link)] text-[var(--link)]" : "border-divider text-text"}`}
              >
                {BACKGROUND_LABEL[background]}
              </button>
            ))}
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-divider px-3 py-1 text-[12px] text-text">
              <input
                type="color"
                aria-label="Custom background colour"
                data-custom-bg
                value={a.customBackground ?? "#f9f9f9"}
                onChange={(e) => update({ customBackground: e.target.value })}
                className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
              />
              <span>{a.customBackground ? a.customBackground : "Custom"}</span>
            </label>
          </div>
        </div>
        <div>
          <p className="text-[13px] text-text-2">Font style</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {FONTS.map((font) => (
              <button
                key={font}
                type="button"
                aria-pressed={a.font === font}
                data-font-choice={font}
                onClick={() => update({ font })}
                className={`rounded-full border px-3 py-1.5 text-[13px] ${a.font === font ? "border-[var(--link)] text-[var(--link)]" : "border-divider text-text"}`}
              >
                {FONT_LABEL[font]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[13px] text-text-2">Text size</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {FONT_SIZES.map((fontSize) => (
              <button
                key={fontSize}
                type="button"
                aria-pressed={a.fontSize === fontSize}
                data-font-size-choice={fontSize}
                onClick={() => update({ fontSize })}
                className={`rounded-full border px-3 py-1.5 text-[13px] ${a.fontSize === fontSize ? "border-[var(--link)] text-[var(--link)]" : "border-divider text-text"}`}
              >
                {SIZE_LABEL[fontSize]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[13px] text-text-2">Card corners</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {RADII.map((radius) => (
              <button
                key={radius}
                type="button"
                aria-pressed={a.radius === radius}
                data-radius-choice={radius}
                onClick={() => update({ radius })}
                className={`rounded-full border px-3 py-1.5 text-[13px] ${a.radius === radius ? "border-[var(--link)] text-[var(--link)]" : "border-divider text-text"}`}
              >
                {RADIUS_LABEL[radius]}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-3 text-[14px] text-text">
          <input type="checkbox" checked={a.compact} onChange={(e) => update({ compact: e.target.checked })} className="h-4 w-4 accent-[var(--link)]" />
          Compact layout (smaller text, more on screen)
        </label>
        <label className="flex items-center gap-3 text-[14px] text-text">
          <input type="checkbox" checked={a.reducedMotion} onChange={(e) => update({ reducedMotion: e.target.checked })} className="h-4 w-4 accent-[var(--link)]" />
          Fewer animations
        </label>
      </div>
    </section>
  );
}

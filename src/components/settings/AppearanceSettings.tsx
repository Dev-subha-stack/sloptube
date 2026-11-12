"use client";

import { useEffect, useState } from "react";
import { ACCENTS, APPEARANCE_KEY, DEFAULT_APPEARANCE, applyAppearance, parseAppearance, type Accent, type Appearance } from "@/lib/appearance";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";

const ACCENT_LABEL: Record<Accent, string> = { red: "Red", blue: "Blue", green: "Green", purple: "Purple", orange: "Orange" };

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

  return (
    <section id="appearance" data-appearance className="mt-8 border-t border-divider pt-6 md:grid md:grid-cols-[220px_1fr] md:gap-8">
      <div>
        <h2 className="text-[16px] font-medium text-text">Appearance</h2>
        <p className="mt-1 text-[13px] text-text-2">How sloptube looks in this browser.</p>
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
          <div className="mt-2 flex flex-wrap gap-3">
            {ACCENTS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={a.accent === c}
                aria-label={ACCENT_LABEL[c]}
                title={ACCENT_LABEL[c]}
                onClick={() => update({ accent: c })}
                data-accent-swatch={c}
                className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-[var(--surface)] ${a.accent === c ? "ring-2 ring-[var(--text)]" : ""}`}
                style={{ background: `var(--accent-${c})` }}
              />
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

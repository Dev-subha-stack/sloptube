"use client";

import { useEffect, useState } from "react";
import { isMessageSoundEnabled, setMessageSoundEnabled } from "@/lib/messages/notification-sound";

/** Settings > Notifications. This preference is stored locally in this browser. */
export function MessageSoundSettings() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isMessageSoundEnabled());
  }, []);

  function update(enabled: boolean) {
    setEnabled(enabled);
    setMessageSoundEnabled(enabled);
  }

  return (
    <section
      id="message-sound"
      data-message-sound
      className="mt-8 border-t border-divider pt-6 md:grid md:grid-cols-[220px_1fr] md:gap-8"
    >
      <div>
        <h2 className="text-[16px] font-medium text-text">Notifications</h2>
        <p className="mt-1 text-[13px] text-text-2">Choose how sloptube alerts you in this browser.</p>
      </div>
      <div className="mt-4 md:mt-0">
        <label className="flex cursor-pointer items-start gap-3 text-[14px] text-text">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => update(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--link)]"
            data-message-sound-toggle
          />
          <span>
            <span className="block font-medium">Incoming message sound</span>
            <span className="mt-1 block text-[13px] text-text-2">
              Play a soft chime when a new direct message arrives. Tap or click the page once to allow audio playback.
            </span>
          </span>
        </label>
      </div>
    </section>
  );
}

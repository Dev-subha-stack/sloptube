export const MESSAGE_SOUND_KEY = "sloptube-message-sound";

/** Sound notifications are enabled by default and saved only in this browser. */
export function isMessageSoundEnabled(): boolean {
  try {
    return typeof window === "undefined" || window.localStorage.getItem(MESSAGE_SOUND_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setMessageSoundEnabled(enabled: boolean): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MESSAGE_SOUND_KEY, String(enabled));
    }
  } catch {
    // Storage may be unavailable in private browsing; the UI still remains usable.
  }
}

/** Plays a short, soft chime. Audio failures are intentionally non-fatal. */
export function playMessageNotificationSound(context: AudioContext | null): void {
  if (!context || !isMessageSoundEnabled()) return;

  const play = () => {
    if (context.state !== "running") return;

    try {
      const startAt = context.currentTime;
      [880, 1174.66].forEach((frequency, index) => {
        const start = startAt + index * 0.09;
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.04, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.2);
      });
    } catch {
      // A notification sound must never interrupt message delivery or rendering.
    }
  };

  if (context.state === "running") {
    play();
  } else {
    void context.resume().then(play).catch(() => {
      // Browsers can still block audio until the user interacts with the page.
    });
  }
}

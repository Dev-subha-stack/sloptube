import { afterEach, describe, expect, it } from "vitest";
import {
  isMessageSoundEnabled,
  MESSAGE_SOUND_KEY,
  setMessageSoundEnabled,
} from "@/lib/messages/notification-sound";

afterEach(() => {
  window.localStorage.clear();
});

describe("message notification sound preference", () => {
  it("is enabled by default", () => {
    expect(isMessageSoundEnabled()).toBe(true);
  });

  it("can be disabled", () => {
    setMessageSoundEnabled(false);
    expect(window.localStorage.getItem(MESSAGE_SOUND_KEY)).toBe("false");
    expect(isMessageSoundEnabled()).toBe(false);
  });

  it("can be enabled again", () => {
    setMessageSoundEnabled(false);
    setMessageSoundEnabled(true);
    expect(window.localStorage.getItem(MESSAGE_SOUND_KEY)).toBe("true");
    expect(isMessageSoundEnabled()).toBe(true);
  });
});

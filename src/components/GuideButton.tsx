"use client";

import { useUi } from "@/lib/store/ui";
import { MenuIcon } from "./icons";

/** The hamburger in the top bar. */
export function GuideButton() {
  const toggle = useUi((s) => s.toggleGuide);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Guide"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-icon hover:bg-hover sm:h-10 sm:w-10"
    >
      <MenuIcon className="h-6 w-6" />
    </button>
  );
}

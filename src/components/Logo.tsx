import Link from "next/link";
import { LogoMark } from "./icons";

/** The green slop mark and the two tone wordmark: "slop" in green, "tube" in the text color. */
export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="sloptube home"
      className="flex h-14 items-center gap-1 pl-2 pr-2 sm:pl-4 sm:pr-3"
    >
      <LogoMark className="h-6 w-6 sm:h-7 sm:w-7" />
      <span className="text-[18px] font-bold leading-none tracking-[-0.9px] text-text sm:text-[20px]">
        <span className="text-[var(--logo-word)]">slop</span>tube
      </span>
    </Link>
  );
}

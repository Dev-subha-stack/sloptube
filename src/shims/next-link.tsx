// Stand-in for the old framework's <Link>: a plain anchor that navigates in-app
// through TanStack Router, so any string href works (query strings, /@handle).
import { useRouter } from "@tanstack/react-router";
import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";

type Href = string | { pathname?: string; query?: Record<string, string | number | undefined> };

export type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: Href;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean | null | "auto";
};

function toHref(href: Href): string {
  if (typeof href === "string") return href;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(href.query ?? {})) if (v !== undefined) qs.set(k, String(v));
  const q = qs.toString();
  return `${href.pathname ?? ""}${q ? `?${q}` : ""}`;
}

function isInternal(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, replace, scroll, prefetch: _prefetch, onClick, target, ...rest },
  ref,
) {
  const router = useRouter();
  const url = toHref(href);
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (!isInternal(url) || (target && target !== "_self")) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (rest.download !== undefined) return;
    e.preventDefault();
    void router.navigate({ href: url, replace: replace === true, resetScroll: scroll !== false });
  }
  return <a ref={ref} href={url} target={target} onClick={handleClick} {...rest} />;
});

export default Link;

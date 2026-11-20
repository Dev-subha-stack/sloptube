import { linkify } from "@/lib/text/linkify";

/** Plain text with web addresses turned into links that open in a new tab. */
export function LinkedText({ text }: { text: string }) {
  return (
    <>
      {linkify(text).map((p, i) =>
        p.kind === "text" ? (
          <span key={i}>{p.text}</span>
        ) : (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-[var(--link)] hover:underline" data-desc-link>
            {p.text}
          </a>
        ),
      )}
    </>
  );
}

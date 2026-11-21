import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonRow, videoGridClass } from "@/components/VideoCard";
import type { feedState } from "@/lib/feed/server";
import type { shelfShorts } from "@/lib/shorts/server";
import type { FeedKind } from "@/lib/feed/types";
import { FeedGrid } from "./FeedGrid";

const frame = "mx-auto max-w-[2200px] px-0 py-6 sm:px-6";

const CHIPS: { href: string; label: string; kind?: string }[] = [
  { href: "/", label: "All", kind: "newest" },
  { href: "/trending", label: "Trending", kind: "trending" },
  { href: "/shorts", label: "Snips" },
  { href: "/feed/subscriptions", label: "Subscriptions" },
  { href: "/top-rated", label: "Top rated" },
  { href: "/updates", label: "What's new" },
];

/** YouTube-style chips under the top bar: quick jumps between feeds. */
function Chips({ kind }: { kind: string }) {
  return (
    <nav aria-label="Browse" className="chips -mx-0 mb-5 flex gap-3 overflow-x-auto px-3 pb-1 sm:px-0" data-feed-chips>
      {CHIPS.map((c) => {
        const active = c.kind === kind;
        return (
          <Link
            key={c.href}
            href={c.href}
            data-chip
            aria-current={active ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap rounded-[8px] px-3 py-1.5 text-[14px] font-medium ${
              active ? "bg-text text-[var(--surface)]" : "bg-[var(--hover)] text-text hover:bg-[var(--active)]"
            }`}
          >
            {c.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Header({ title, kind }: { title: string; kind?: string }) {
  return (
    <>
      {kind && <Chips kind={kind} />}
      <h1 className={kind ? "sr-only" : "mb-4 px-3 text-[20px] font-normal leading-7 text-text sm:px-0"}>{title}</h1>
    </>
  );
}

/** While the first page loads: the header over two rows of skeleton cards. */
export function FeedSkeleton({ title }: { title: string }) {
  return (
    <div className={frame} data-feed-state="loading">
      <Header title={title} />
      <div className={videoGridClass}>
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}

/**
 * The home grid and /trending. With the feed flag off (or no database) the
 * feature 1 placeholder grid stays. Signed out people see the same feed.
 * Reads the request, so it is rendered inside <Suspense>.
 */
export type FeedViewData = { state: Awaited<ReturnType<typeof feedState>>; shelf: Awaited<ReturnType<typeof shelfShorts>> };

export function FeedView({
  kind,
  title,
  placeholder,
  data,
}: {
  kind: Extract<FeedKind, "newest" | "trending">;
  title: string;
  placeholder: { title?: string; hint?: string };
  data: FeedViewData;
}) {
  const { state, shelf } = data;
  switch (state.kind) {
    case "off":
    case "no-db":
      return (
        <div data-feed-state={state.kind}>
          <EmptyState {...placeholder} />
        </div>
      );
    case "not-set-up":
      return (
        <div data-feed-state="not-set-up">
          <EmptyState
            title="The home feed isn't set up yet."
            hint="Run supabase/migrations/008_feed.sql in the Supabase SQL editor."
          />
        </div>
      );
    case "ready": {
      // The Snips shelf (feature 11), only on the home feed and only with the shorts flag on.
      if (state.page.cards.length === 0 && shelf.length === 0) {
        return (
          <div data-feed-state="empty">
            <EmptyState title="Nothing here yet" hint="Public videos show up here once they are processed." cards={4} />
          </div>
        );
      }
      return (
        <div className={frame} data-feed-state="ready">
          <Header title={title} kind={kind} />
          <FeedGrid kind={kind} initial={state.page} now={state.now} ranked={kind === "trending"} shelf={shelf} />
        </div>
      );
    }
  }
}

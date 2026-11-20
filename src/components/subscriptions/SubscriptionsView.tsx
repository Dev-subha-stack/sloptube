import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { AccountCircleIcon, SubscriptionsIcon } from "@/components/icons";
import { Avatar } from "@/components/Avatar";
import type { mySubscriptions } from "@/lib/subscriptions/server";

const frame = "mx-auto max-w-[1600px] px-4 py-6 sm:px-6";

function Notice({ state, title, text, children }: { state: string; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div data-subs-state={state} className="flex flex-col items-center px-6 py-20 text-center">
      <SubscriptionsIcon className="h-[120px] w-[120px] text-text-3" />
      <h1 className="mt-6 text-[24px] font-normal leading-8 text-text">{title}</h1>
      <p className="mt-2 max-w-[420px] text-[14px] leading-5 text-text-2">{text}</p>
      {children}
    </div>
  );
}

export function SubscriptionsSkeleton() {
  return (
    <div className={frame} data-subs-state="loading">
      <div className="mb-5 h-6 w-40 rounded bg-skeleton" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-divider bg-surface p-4">
            <div className="h-12 w-12 shrink-0 rounded-full bg-skeleton" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-skeleton" />
              <div className="h-3 w-1/2 rounded bg-skeleton" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** /feed/subscriptions lists the channels the viewer follows, not their videos. */
export function SubscriptionsView({ state }: { state: Awaited<ReturnType<typeof mySubscriptions>> }) {
  switch (state.kind) {
    case "off":
    case "no-db":
      return (
        <div data-subs-state={state.kind}>
          <EmptyState title="Subscriptions aren't available yet." hint="Try again when subscriptions are enabled." />
        </div>
      );
    case "signed-out":
      return (
        <Notice state="signed-out" title="Your subscriptions" text="Sign in to see the channels you follow.">
          <Link
            href="/login?next=%2Ffeed%2Fsubscriptions"
            className="mt-6 inline-flex h-9 items-center gap-2 rounded-[2px] border border-[var(--link)] px-[11px] text-[14px] font-medium uppercase text-[var(--link)]"
          >
            <AccountCircleIcon className="h-6 w-6" />
            Sign in
          </Link>
        </Notice>
      );
    case "not-set-up":
      return (
        <div data-subs-state="not-set-up">
          <EmptyState title="Subscriptions aren't set up yet." hint="Apply the subscriptions database migrations to enable this page." />
        </div>
      );
    case "ready":
      if (state.channels.length === 0) {
        return (
          <Notice state="empty" title="No subscriptions yet" text="Subscribe to a channel and it will appear here.">
            <Link href="/" className="btn-blue mt-6">Browse videos</Link>
          </Notice>
        );
      }
      return (
        <div className={frame} data-subs-state="ready" data-channel-count={state.channels.length}>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-[24px] font-normal leading-8 text-text">Subscriptions</h1>
              <p className="mt-1 text-[14px] text-text-2">{state.channels.length} {state.channels.length === 1 ? "channel" : "channels"} you follow</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {state.channels.map((channel) => (
              <Link
                key={channel.id}
                href={`/@${channel.handle}`}
                data-subscription-channel={channel.id}
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-divider bg-surface p-4 transition-colors hover:bg-hover"
              >
                <Avatar name={channel.name} url={channel.avatarUrl} size={52} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-text group-hover:underline">{channel.name}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-text-2">@{channel.handle}</span>
                  {channel.notify && <span className="mt-1 block text-[11px] font-medium text-[var(--link)]">Upload notifications on</span>}
                </span>
                <span className="text-text-3" aria-hidden>›</span>
              </Link>
            ))}
          </div>
        </div>
      );
  }
}

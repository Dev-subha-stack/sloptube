import Link from "next/link";
import { StaffBadge } from "@/components/admin/RoleBadge";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { AccountCircleIcon, SubscriptionsIcon } from "@/components/icons";
import { formatSubscribers } from "@/lib/channels/validation";
import type { subscribedChannels } from "@/lib/subscriptions/server";
import { timeAgo } from "@/lib/watch/format";
import { SubscribeButton } from "./SubscribeButton";

const frame = "mx-auto max-w-[1284px] px-3 py-6 sm:px-6";

/** The big grey icon with a line or two under it, like the 2019 empty pages. */
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

const grid = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export function SubscriptionsSkeleton() {
  return (
    <div className={frame} data-subs-state="loading">
      <div className="mb-5 h-6 w-40 bg-skeleton" />
      <div className={grid}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col items-center rounded-[12px] bg-surface p-5">
            <div className="h-[88px] w-[88px] rounded-full bg-skeleton" />
            <div className="mt-3 h-4 w-28 bg-skeleton" />
            <div className="mt-2 h-3 w-20 bg-skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** /feed/subscriptions: a grid of the channels the person subscribes to, A to Z. */
export function SubscriptionsView({ state }: { state: Awaited<ReturnType<typeof subscribedChannels>> }) {
  switch (state.kind) {
    case "off":
    case "no-db":
      return (
        <div data-subs-state={state.kind}>
          <EmptyState title="No subscriptions yet." hint="Subscriptions aren't switched on yet." />
        </div>
      );
    case "signed-out":
      return (
        <Notice state="signed-out" title="Don't miss new videos" text="Sign in to see the channels you subscribe to.">
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
          <EmptyState title="Subscriptions aren't set up yet." hint="The subscriptions list isn't available yet." />
        </div>
      );
    case "ready":
      if (state.channels.length === 0) {
        return (
          <Notice state="empty" title="No subscriptions yet" text="Subscribe to channels you like and they show up here.">
            <Link href="/" className="btn-blue mt-6">
              Browse videos
            </Link>
          </Notice>
        );
      }
      return (
        <div className={frame} data-subs-state="ready">
          <h1 className="mb-5 text-[20px] leading-7 text-text">
            Subscriptions <span className="text-text-2">· {state.channels.length}</span>
          </h1>
          <div className={grid}>
            {state.channels.map((c) => (
              <div
                key={c.id}
                className="lift group flex flex-col items-center rounded-[12px] bg-surface p-5 text-center"
                data-sub-channel={c.handle}
              >
                <Link href={`/@${c.handle}`} className="flex flex-col items-center">
                  <span className="transition-transform duration-200 group-hover:scale-105">
                    <Avatar name={c.name} url={c.avatarUrl} size={88} />
                  </span>
                  <span className="mt-3 line-clamp-1 text-[16px] font-medium text-text">
                    {c.name}
                    <StaffBadge name={c.handle} />
                  </span>
                  <span className="mt-0.5 text-[13px] text-text-2">@{c.handle}</span>
                  <span className="mt-0.5 text-[13px] text-text-2">
                    {formatSubscribers(c.subscriberCount)} · {c.videoCount} {c.videoCount === 1 ? "video" : "videos"}
                  </span>
                  <span className="mt-0.5 h-[18px] text-[12px] text-text-3">
                    {c.latestUploadAt ? `Last upload ${timeAgo(c.latestUploadAt, state.now)}` : ""}
                  </span>
                </Link>
                <div className="mt-3">
                  <SubscribeButton channelId={c.id} channelName={c.name} count={c.subscriberCount} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
  }
}

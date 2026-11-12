import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import Link from "next/link";
import { RatedEmpty, RatedGrid } from "@/components/ratings/RatedList";

const loadMine = createServerFn({ method: "GET" }).handler(async () => {
  const { myRatings } = await import("@/lib/ratings/server");
  return { items: await myRatings() };
});

function MyRatings() {
  const { items } = Route.useLoaderData();
  return (
    <div className="px-0 py-6 sm:px-6" data-my-ratings>
      <div className="mb-6 flex items-center justify-between px-3 sm:px-0">
        <h1 className="text-[20px] text-text">Your ratings</h1>
        <Link href="/top-rated" className="text-[14px] text-[var(--link)]">
          See top rated
        </Link>
      </div>
      {items === null ? (
        <RatedEmpty title="Sign in to see your ratings" hint="Videos you rate with stars are kept here." />
      ) : items.length === 0 ? (
        <RatedEmpty title="You haven't rated anything yet" hint="Rate videos with the stars under the player and they show up here." />
      ) : (
        <RatedGrid items={items} mine />
      )}
    </div>
  );
}

export const Route = createFileRoute("/feed/ratings")({
  ssr: false,
  loader: () => loadMine(),
  head: () => ({
    meta: [
      { title: "Your ratings | sloptube" },
      { name: "description", content: "Every video you have rated on sloptube." },
      { property: "og:title", content: "Your ratings | sloptube" },
      { property: "og:description", content: "Every video you have rated on sloptube." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyRatings,
});

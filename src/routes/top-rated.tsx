import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { RatedEmpty, RatedGrid } from "@/components/ratings/RatedList";

const loadTopRated = createServerFn({ method: "GET" }).handler(async () => {
  const { topRated } = await import("@/lib/ratings/server");
  return { items: await topRated() };
});

function TopRated() {
  const { items } = Route.useLoaderData();
  return (
    <div className="px-0 py-6 sm:px-6" data-top-rated>
      <h1 className="mb-6 px-3 text-[20px] text-text sm:px-0">Top rated</h1>
      {items.length === 0 ? (
        <RatedEmpty title="No ratings yet" hint="Rate videos with the stars under the player. The best rated ones show up here." />
      ) : (
        <RatedGrid items={items} />
      )}
    </div>
  );
}

export const Route = createFileRoute("/top-rated")({
  loader: () => loadTopRated(),
  head: () => ({
    meta: [
      { title: "Top rated | sloptube" },
      { name: "description", content: "The best rated videos on sloptube, by viewer star ratings." },
      { property: "og:title", content: "Top rated | sloptube" },
      { property: "og:description", content: "The best rated videos on sloptube, by viewer star ratings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TopRated,
});

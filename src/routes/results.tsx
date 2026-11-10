// Ported page: the original app's /results.
import { createFileRoute, notFound as routeNotFound, redirect as routeRedirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { metadataToHead } from "@/lib/seo/head";

import { ResultsView } from "@/components/search/ResultsView";
import { readQuery } from "@/lib/search/query";

type Search = Record<string, string | undefined>;

const loadResults = createServerFn({ method: "GET" })
  .inputValidator((d: Search) => d)
  .handler(async ({ data }) => {
    const { parseFilters, readQuery } = await import("@/lib/search/query");
    const { searchResults } = await import("@/lib/search/server");
    return searchResults(readQuery(data), parseFilters(data));
  });

function Page() {
  const search = Route.useSearch();
  const state = Route.useLoaderData();
  return <ResultsView params={search} state={state} />;
}


export const Route = createFileRoute("/results")({
  validateSearch: (s: Record<string, unknown>) => s as Record<string, string | undefined>,
  loaderDeps: ({ search }) => ({ search }),
  loader: ({ deps }) => loadResults({ data: deps.search }),
  head: ({ match }) => { const q = readQuery(match.search as Search); return metadataToHead({ title: q ? `${q} | sloptube` : "Search | sloptube" }); },
  component: Page,
});

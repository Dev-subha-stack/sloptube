import { createFileRoute } from "@tanstack/react-router";
import Link from "next/link";
import { BugThread } from "@/components/bugs/BugPages";

function SuggestionPage() {
  const { id } = Route.useParams();
  return (
    <div className="mx-auto max-w-[860px] px-4 py-6 sm:px-6">
      <Link href="/suggestions" className="text-[14px] text-[var(--link)]">
        ← Your suggestions
      </Link>
      <div className="mt-4">
        <BugThread id={id} />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/suggestions/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your suggestion | sloptube" },
      { name: "description", content: "The status of your feature suggestion and replies from the sloptube team." },
      { property: "og:title", content: "Your suggestion | sloptube" },
      { property: "og:description", content: "The status of your feature suggestion and replies from the sloptube team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuggestionPage,
});

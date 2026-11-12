import { createFileRoute } from "@tanstack/react-router";
import Link from "next/link";
import { BugThread } from "@/components/bugs/BugPages";

function BugPage() {
  const { id } = Route.useParams();
  return (
    <div className="mx-auto max-w-[860px] px-4 py-6 sm:px-6">
      <Link href="/bugs" className="text-[14px] text-[var(--link)]">
        ← Your bug reports
      </Link>
      <div className="mt-4">
        <BugThread id={id} />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/bugs/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bug report | sloptube" },
      { name: "description", content: "The status of your bug report and replies from the sloptube team." },
      { property: "og:title", content: "Bug report | sloptube" },
      { property: "og:description", content: "The status of your bug report and replies from the sloptube team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BugPage,
});

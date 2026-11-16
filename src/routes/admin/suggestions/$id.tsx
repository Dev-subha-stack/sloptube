import { createFileRoute } from "@tanstack/react-router";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { BugThread } from "@/components/bugs/BugPages";

function AdminSuggestionPage() {
  const { id } = Route.useParams();
  return (
    <AdminShell tab="suggestions" title="Suggestion">
      <Link href="/admin/suggestions" className="text-[14px] text-[var(--link)]">
        ← All suggestions
      </Link>
      <div className="mt-4">
        <BugThread id={id} staffView />
      </div>
    </AdminShell>
  );
}

export const Route = createFileRoute("/admin/suggestions/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Suggestion | sloptube admin" },
      { name: "description", content: "One feature suggestion with its status and replies." },
      { property: "og:title", content: "Suggestion | sloptube admin" },
      { property: "og:description", content: "One feature suggestion with its status and replies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSuggestionPage,
});

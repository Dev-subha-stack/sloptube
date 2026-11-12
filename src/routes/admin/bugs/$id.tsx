import { createFileRoute } from "@tanstack/react-router";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { BugThread } from "@/components/bugs/BugPages";

function AdminBugPage() {
  const { id } = Route.useParams();
  return (
    <AdminShell tab="bugs" title="Bug report">
      <Link href="/admin/bugs" className="text-[14px] text-[var(--link)]">
        ← All bug reports
      </Link>
      <div className="mt-4">
        <BugThread id={id} staffView />
      </div>
    </AdminShell>
  );
}

export const Route = createFileRoute("/admin/bugs/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bug report | sloptube admin" },
      { name: "description", content: "One bug report with its status and replies." },
      { property: "og:title", content: "Bug report | sloptube admin" },
      { property: "og:description", content: "One bug report with its status and replies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminBugPage,
});

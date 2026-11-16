import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminBugs } from "@/components/admin/StaffPages";

export const Route = createFileRoute("/admin/suggestions/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Suggestions | sloptube admin" },
      { name: "description", content: "Feature ideas sent by users, for admins and moderators." },
      { property: "og:title", content: "Suggestions | sloptube admin" },
      { property: "og:description", content: "Feature ideas sent by users, for admins and moderators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminShell tab="suggestions" title="Suggestions" hint="Feature ideas from users. Change the status and reply; the sender sees both.">
      <AdminBugs kind="idea" />
    </AdminShell>
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminBugs } from "@/components/admin/StaffPages";

export const Route = createFileRoute("/admin/bugs/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bug reports | sloptube admin" },
      { name: "description", content: "Bug reports sent by users, for admins and moderators." },
      { property: "og:title", content: "Bug reports | sloptube admin" },
      { property: "og:description", content: "Bug reports sent by users, for admins and moderators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminShell tab="bugs" title="Bug reports" hint="Reports from users. Change the status and reply; the reporter sees both.">
      <AdminBugs />
    </AdminShell>
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminComments } from "@/components/admin/StaffPages";

export const Route = createFileRoute("/admin/comments")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Comments | sloptube admin" },
      { name: "description", content: "The newest comments across the site, for moderators." },
      { property: "og:title", content: "Comments | sloptube admin" },
      { property: "og:description", content: "The newest comments across the site, for moderators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminShell tab="comments" title="Comments" hint="The newest comments across the site. Admins and moderators can remove them.">
      <AdminComments />
    </AdminShell>
  ),
});

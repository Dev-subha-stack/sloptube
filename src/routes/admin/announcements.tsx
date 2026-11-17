import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminAnnouncements } from "@/components/announcements/AdminAnnouncements";

export const Route = createFileRoute("/admin/announcements")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Announcements | sloptube admin" },
      { name: "description", content: "Post site-wide announcements to everyone on sloptube." },
      { property: "og:title", content: "Announcements | sloptube admin" },
      { property: "og:description", content: "Post site-wide announcements to everyone on sloptube." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminShell tab="announcements" title="Announcements" hint="Messages for everyone: new features, fixes and maintenance. The newest shows as a banner until people close it.">
      <AdminAnnouncements />
    </AdminShell>
  ),
});

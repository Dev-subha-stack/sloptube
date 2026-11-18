import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminVideos } from "@/components/admin/AdminVideos";

export const Route = createFileRoute("/admin/videos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Videos | sloptube admin" },
      { name: "description", content: "Search every video on sloptube and delete one for good." },
      { property: "og:title", content: "Videos | sloptube admin" },
      { property: "og:description", content: "Search every video on sloptube and delete one for good." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminShell tab="videos" title="Videos" hint="Every video, including private and trashed ones. Deleting is permanent.">
      <AdminVideos />
    </AdminShell>
  ),
});

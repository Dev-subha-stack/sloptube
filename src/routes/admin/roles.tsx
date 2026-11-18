import { createFileRoute } from "@tanstack/react-router";
import { AdminRoles } from "@/components/admin/AdminRoles";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/roles")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Roles & badges | sloptube admin" },
      { name: "description", content: "Create staff roles with badge colours and powers, and give them to people." },
      { property: "og:title", content: "Roles & badges | sloptube admin" },
      { property: "og:description", content: "Create staff roles with badge colours and powers, and give them to people." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminShell tab="roles" title="Roles & badges" hint="Make roles like Helper or Manager: pick a badge colour and exactly which powers they have.">
      <AdminRoles />
    </AdminShell>
  ),
});

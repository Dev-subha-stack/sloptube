import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminUsers } from "@/components/admin/StaffPages";

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Users | sloptube admin" },
      { name: "description", content: "Every registered account, with roles and bans." },
      { property: "og:title", content: "Users | sloptube admin" },
      { property: "og:description", content: "Every registered account, with roles and bans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminShell tab="users" title="Users" hint="Every account. Admins can make moderators and admins, and ban accounts.">
      <AdminUsers />
    </AdminShell>
  ),
});

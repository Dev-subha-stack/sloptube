"use client";

import { getRoleBadge, type UserRole } from "@/lib/admin/roles";

export function RoleBadge({ role }: { role: UserRole | string | null | undefined }) {
  const badge = getRoleBadge(role);
  if (!badge) return null;
  return (
    <span
      className="ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none"
      style={{ backgroundColor: badge.bg, color: badge.color }}
    >
      {badge.label}
    </span>
  );
}

"use client";

import { useEffect } from "react";
import { getRoleBadge, type UserRole } from "@/lib/admin/roles";
import { useStaff } from "@/lib/store/staff";

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
    </svg>
  );
}

/** The staff badge: blue for the owner and admins, green for moderators. */
export function RoleBadge({ role }: { role: UserRole | "owner" | string | null | undefined }) {
  const badge = getRoleBadge(role);
  if (!badge) return null;
  return (
    <span
      className="ml-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 align-middle text-[11px] font-medium leading-none"
      style={{ backgroundColor: badge.bg, color: badge.color }}
      title={badge.label}
      data-role-badge={role ?? undefined}
    >
      <ShieldIcon className="h-3 w-3" />
      {badge.label}
    </span>
  );
}

/** The badge for a channel handle or username, when that person is staff. */
export function StaffBadge({ name }: { name: string | null | undefined }) {
  const load = useStaff((s) => s.load);
  const badge = useStaff((s) => (name ? s.byName[name.toLowerCase()] : undefined));
  useEffect(() => load(), [load]);
  if (!badge) return null;
  return <RoleBadge role={badge} />;
}

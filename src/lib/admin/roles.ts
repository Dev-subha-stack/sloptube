// Admin role utilities for RBAC.
// No imports so Node can load this file directly.

export type UserRole = "user" | "moderator" | "admin";

export function isStaff(role: UserRole | string | null | undefined): boolean {
  return role === "admin" || role === "moderator";
}

export function isAdmin(role: UserRole | string | null | undefined): boolean {
  return role === "admin";
}

export function canManageUsers(role: UserRole | string | null | undefined): boolean {
  return role === "admin";
}

export function canManageBugs(role: UserRole | string | null | undefined): boolean {
  return role === "admin" || role === "moderator";
}

export type RoleBadge = { color: string; bg: string; label: string };

/** Blue for the owner and admins, green for moderators (colours are theme tokens). */
export function getRoleBadge(role: UserRole | "owner" | string | null | undefined): RoleBadge | null {
  if (role === "owner") return { color: "var(--badge-text)", bg: "var(--badge-admin)", label: "Owner" };
  if (role === "admin") return { color: "var(--badge-text)", bg: "var(--badge-admin)", label: "Admin" };
  if (role === "moderator") return { color: "var(--badge-text)", bg: "var(--badge-mod)", label: "Mod" };
  return null;
}

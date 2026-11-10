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

export function getRoleBadge(role: UserRole | string | null | undefined): RoleBadge | null {
  if (role === "admin") return { color: "#fff", bg: "#3b82f6", label: "Admin" };
  if (role === "moderator") return { color: "#fff", bg: "#22c55e", label: "Mod" };
  return null;
}

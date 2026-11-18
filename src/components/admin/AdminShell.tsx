"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { canOpenTab } from "@/lib/admin/permissions";
import { usePerms } from "@/lib/store/perms";
import { useSession } from "@/lib/store/session";

const TABS = [
  { key: "users", label: "Users", href: "/admin/users" },
  { key: "roles", label: "Roles & badges", href: "/admin/roles" },
  { key: "videos", label: "Videos", href: "/admin/videos" },
  { key: "announcements", label: "Announcements", href: "/admin/announcements" },
  { key: "bugs", label: "Bugs", href: "/admin/bugs" },
  { key: "suggestions", label: "Suggestions", href: "/admin/suggestions" },
  { key: "comments", label: "Comments", href: "/admin/comments" },
  { key: "queue", label: "Reports", href: "/admin" },
  { key: "log", label: "Mod log", href: "/admin/log" },
  { key: "words", label: "Word list", href: "/admin/words" },
  { key: "messages", label: "Messages", href: "/admin/messages" },
] as const;

export type AdminTab = (typeof TABS)[number]["key"];

/** The admin pages: a title, the tabs, a preview line in `next dev` without a database. */
export function AdminShell({ tab, title, hint, preview, children }: { tab: AdminTab; title: string; hint?: ReactNode; preview?: boolean; children: ReactNode }) {
  const user = useSession((s) => s.user);
  const loaded = useSession((s) => s.loaded);
  const perms = usePerms((s) => s.perms);
  const isAdmin = usePerms((s) => s.isAdmin);
  const load = usePerms((s) => s.load);
  useEffect(() => {
    if (loaded) load(user?.id ?? null);
  }, [loaded, user?.id, load]);
  // Only the tabs this person has the power for. The database checks every action again.
  const ready = loaded && perms !== null;
  const tabs = ready ? TABS.filter((t) => canOpenTab(t.key, perms, isAdmin)) : [];
  const allowed = ready && canOpenTab(tab, perms, isAdmin);
  return (
    <div className="min-h-[calc(100dvh-56px)] bg-[var(--studio-page)]" data-admin-page={tab}>
      <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-8">
        {preview && (
          <p className="mb-4 rounded-[2px] bg-hover px-4 py-3 text-[13px] text-text-2" data-preview-notice>
            Preview: made up rows, shown in development without a database.
          </p>
        )}
        <h1 className="text-[24px] font-normal leading-8 text-text">{title}</h1>
        {hint && <p className="mt-1 text-[14px] text-text-2">{hint}</p>}
        <nav aria-label="Admin" className="-mx-4 mb-6 mt-4 flex overflow-x-auto border-b border-divider sm:mx-0">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              aria-current={t.key === tab ? "page" : undefined}
              className={`flex h-12 shrink-0 items-center border-b-[3px] px-4 text-[14px] font-medium uppercase tracking-[0.007px] sm:px-6 ${
                t.key === tab ? "border-[var(--studio-accent)] text-[var(--studio-accent)]" : "border-transparent text-text-2 hover:text-text"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {!ready ? (
          <p className="text-[14px] text-text-2" data-admin-loading>
            Loading...
          </p>
        ) : allowed ? (
          children
        ) : (
          <p className={`${card} px-4 py-8 text-center text-[14px] text-text-2`} data-admin-denied>
            {user ? "Your role doesn't include this page." : "Sign in with a staff account to see this page."}
            {tabs[0] && (
              <>
                {" "}
                <Link href={tabs[0].href} className="text-[var(--link)]">
                  Go to {tabs[0].label}
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export function AdminError({ code }: { code: string }) {
  return (
    <p className="rounded-[2px] bg-surface px-4 py-6 text-center text-[14px] text-text-2" data-admin-error={code}>
      {code === "not_set_up" ? "Moderation isn't set up yet: run migration 016." : "The admin data could not be read. Try again."}
    </p>
  );
}

export const card = "rounded-[2px] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.1)] dark:shadow-none dark:ring-1 dark:ring-divider";

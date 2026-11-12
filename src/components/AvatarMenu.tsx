"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StaffBadge } from "@/components/admin/RoleBadge";
import { myRoles, useAccounts } from "@/lib/accounts/switcher";
import { useFlag, type SessionUser } from "@/lib/store/session";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";
import {
  BugReportIcon,
  ChannelIcon,
  CheckIcon,
  PaletteIcon,
  SettingsIcon,
  ShieldIcon,
  SignOutIcon,
  StarIcon,
} from "./icons";
import { Menu, MenuDivider, MenuItem } from "./Menu";
import { ThemeMenuItem } from "./ThemeMenuItem";

function PersonAddIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

/** The avatar in the top bar and its menu: your account, quick account switching, and shortcuts. */
export function AvatarMenu({ user, email }: { user: SessionUser; email: string | null }) {
  const router = useRouter();
  const channels = useFlag("channels");
  const accounts = useAccounts((s) => s.accounts);
  const switching = useAccounts((s) => s.switching);
  const switchError = useAccounts((s) => s.error);
  const load = useAccounts((s) => s.load);
  const remember = useAccounts((s) => s.remember);
  const switchTo = useAccounts((s) => s.switchTo);
  const addAnother = useAccounts((s) => s.addAnother);
  const forget = useAccounts((s) => s.forget);
  const [roles, setRoles] = useState<string[]>([]);
  const staff = roles.includes("admin") || roles.includes("moderator");

  useEffect(() => {
    load();
    void remember({ name: user.displayName, username: user.username, avatarUrl: user.avatarUrl });
    void myRoles().then(setRoles);
  }, [load, remember, user.id, user.displayName, user.username, user.avatarUrl]);

  const others = accounts.filter((a) => a.userId !== user.id);

  async function signOut() {
    forget(user.id);
    await createClient()?.auth.signOut({ scope: "local" });
    const next = others[0];
    if (next) {
      await switchTo(next.userId);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <Menu label="Account menu" button={<Avatar name={user.displayName} url={user.avatarUrl} size={32} />}>
      {(close) => (
        <>
          <div className="flex gap-4 px-4 pb-4 pt-2">
            <Avatar name={user.displayName} url={user.avatarUrl} size={40} />
            <div className="min-w-0">
              <p className="truncate text-[16px] font-medium leading-[22px] text-text">
                {user.displayName}
                <StaffBadge name={user.channelHandle ?? user.username} />
              </p>
              <p className="truncate text-[14px] leading-5 text-text-2">@{user.username}</p>
              {email && <p className="truncate text-[14px] leading-5 text-text-2">{email}</p>}
              <Link href="/settings" onClick={close} className="mt-2 inline-block text-[14px] text-[var(--link)]">
                Manage your account
              </Link>
            </div>
          </div>
          <MenuDivider />
          <div data-account-switcher>
            <p className="px-4 pb-1 pt-2 text-[12px] font-medium uppercase tracking-wide text-text-2">Accounts</p>
            <div className="flex items-center gap-3 px-4 py-2">
              <Avatar name={user.displayName} url={user.avatarUrl} size={28} />
              <span className="min-w-0 flex-1 truncate text-[14px] text-text">{user.displayName}</span>
              <CheckIcon className="h-5 w-5 text-[var(--link)]" />
            </div>
            {others.map((a) => (
              <div key={a.userId} className="group flex items-center hover:bg-hover">
                <button
                  type="button"
                  role="menuitem"
                  data-switch-account={a.username}
                  disabled={switching !== null}
                  onClick={() => void switchTo(a.userId)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left"
                >
                  <Avatar name={a.name} url={a.avatarUrl} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-text">{a.name}</span>
                    <span className="block truncate text-[12px] text-text-2">{a.email ?? `@${a.username}`}</span>
                  </span>
                  {switching === a.userId && <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--link)] border-t-transparent" />}
                </button>
                <button
                  type="button"
                  title="Remove from this list"
                  aria-label={`Remove ${a.name} from this list`}
                  onClick={() => forget(a.userId)}
                  className="mr-2 grid h-8 w-8 place-items-center rounded-full text-[18px] text-text-3 opacity-0 hover:text-text group-hover:opacity-100 focus:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
            {switchError && <p className="px-4 py-1 text-[12px] text-[var(--error)]">{switchError}</p>}
            <MenuItem
              icon={<PersonAddIcon className="h-6 w-6" />}
              onClick={() => {
                close();
                void addAnother(window.location.pathname + window.location.search);
              }}
            >
              Add account
            </MenuItem>
          </div>
          <MenuDivider />
          {channels && user.channelHandle && (
            <MenuItem
              icon={<ChannelIcon className="h-6 w-6" />}
              onClick={() => {
                close();
                router.push(`/@${user.channelHandle}`);
              }}
            >
              Your channel
            </MenuItem>
          )}
          <MenuItem
            icon={<StarIcon className="h-6 w-6" />}
            onClick={() => {
              close();
              router.push("/feed/ratings");
            }}
          >
            Your ratings
          </MenuItem>
          {staff && (
            <MenuItem
              icon={<ShieldIcon className="h-6 w-6" />}
              onClick={() => {
                close();
                router.push(roles.includes("admin") ? "/admin/users" : "/admin/bugs");
              }}
            >
              Admin panel
            </MenuItem>
          )}
          <MenuItem
            icon={<BugReportIcon className="h-6 w-6" />}
            onClick={() => {
              close();
              router.push("/bugs");
            }}
          >
            Report a bug
          </MenuItem>
          <MenuItem
            icon={<SettingsIcon className="h-6 w-6" />}
            onClick={() => {
              close();
              router.push("/settings");
            }}
          >
            Settings
          </MenuItem>
          <MenuItem
            icon={<PaletteIcon className="h-6 w-6" />}
            onClick={() => {
              close();
              router.push("/settings#appearance");
            }}
          >
            Appearance
          </MenuItem>
          <ThemeMenuItem />
          <MenuItem
            icon={<SignOutIcon className="h-6 w-6" />}
            onClick={() => {
              close();
              void signOut();
            }}
          >
            Sign out
          </MenuItem>
        </>
      )}
    </Menu>
  );
}

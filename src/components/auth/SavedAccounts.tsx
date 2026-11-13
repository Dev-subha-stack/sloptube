"use client";

import { useEffect } from "react";
import { Avatar } from "@/components/Avatar";
import { useAccounts } from "@/lib/accounts/switcher";

/** On the sign-in page: accounts already signed in on this browser, one tap to continue as one. */
export function SavedAccounts() {
  const accounts = useAccounts((s) => s.accounts);
  const switching = useAccounts((s) => s.switching);
  const error = useAccounts((s) => s.error);
  const load = useAccounts((s) => s.load);
  const switchTo = useAccounts((s) => s.switchTo);
  const forget = useAccounts((s) => s.forget);

  useEffect(() => load(), [load]);
  if (accounts.length === 0) return null;

  return (
    <div className="mb-6" data-saved-accounts>
      <p className="mb-2 text-[14px] text-text-2">Continue as</p>
      <div className="divide-y divide-[var(--divider)] rounded-[4px] border border-[var(--divider)]">
        {accounts.map((a) => (
          <div key={a.userId} className="flex items-center">
            <button
              type="button"
              disabled={switching !== null}
              onClick={() => void switchTo(a.userId)}
              data-continue-as={a.username}
              className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left hover:bg-hover"
            >
              <Avatar name={a.name} url={a.avatarUrl} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-text">{a.name}</span>
                <span className="block truncate text-[12px] text-text-2">{a.email ?? `@${a.username}`}</span>
              </span>
              {switching === a.userId && <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--link)] border-t-transparent" />}
            </button>
            <button
              type="button"
              aria-label={`Remove ${a.name} from this browser`}
              title="Remove from this browser"
              onClick={() => forget(a.userId)}
              className="mr-2 grid h-8 w-8 place-items-center rounded-full text-[18px] text-text-3 hover:bg-hover hover:text-text"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-[13px] text-[var(--error)]">{error}</p>}
      <p className="mt-4 text-[14px] text-text-2">Or sign in to another account:</p>
    </div>
  );
}

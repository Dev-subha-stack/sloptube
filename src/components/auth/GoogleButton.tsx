"use client";

import { useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { GoogleIcon } from "../icons";

/**
 * Starts Google sign in through Supabase. Google sends people back to
 * Supabase, which sends them to /auth/callback on this site.
 */
export function GoogleButton({ label, next }: { label: string; next: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    // Where to go once the session is set: read by /auth/callback.
    try {
      sessionStorage.setItem("sloptube-next", next);
    } catch {
      // storage blocked: /auth/callback falls back to the home page
    }
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth/callback`,
    });
    if (result.error) {
      setBusy(false);
      setError(result.error.message ?? "Google sign in did not finish. Try again.");
      return;
    }
    if (result.redirected) return;
    window.location.assign(`/auth/callback`);
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="flex h-10 w-full items-center justify-center gap-3 rounded border border-[#dadce0] bg-surface text-[14px] font-medium text-[#3c4043] hover:bg-[#f8faff] disabled:opacity-60 dark:border-[#5f6368] dark:text-[#e8eaed] dark:hover:bg-hover"
      >
        <GoogleIcon className="h-[18px] w-[18px]" />
        {label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[12px] text-error">
          {error}
        </p>
      )}
    </div>
  );
}

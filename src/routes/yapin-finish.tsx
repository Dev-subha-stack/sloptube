// Last step of "Continue with Yapin'": redeems the one time token the server left
// in a short lived httpOnly cookie, which sets the session in this browser.
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { safeNext } from "@/lib/accounts/redirect";

/** Hands the token over once and deletes the cookie, so it can never be used twice from here. */
const takeYapinToken = createServerFn({ method: "POST" }).handler(async () => {
  const { getCookie, deleteCookie, setResponseHeader } = await import("@tanstack/react-start/server");
  const { YAPIN_OTP_COOKIE } = await import("@/lib/yapin/finish");
  setResponseHeader("Cache-Control", "no-store");
  const token = getCookie(YAPIN_OTP_COOKIE) ?? null;
  deleteCookie(YAPIN_OTP_COOKIE, { path: "/" });
  return { token: token && /^[A-Za-z0-9_-]{10,200}$/.test(token) ? token : null };
});

export const Route = createFileRoute("/yapin-finish")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => s as Record<string, string | undefined>,
  head: () => ({ meta: [{ title: "Signing in | sloptube" }, { name: "robots", content: "noindex" }] }),
  component: YapinFinish,
});

function YapinFinish() {
  const search = Route.useSearch();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { token } = await takeYapinToken();
      if (!token) return setFailed(true);
      const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: "magiclink" });
      if (cancelled) return;
      if (error) return setFailed(true);
      window.location.replace(safeNext(search.next));
    })().catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [search.next]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      {failed ? (
        <>
          <p className="text-[18px] text-text">Yapin&apos; sign in didn&apos;t finish.</p>
          <p className="mt-1 text-[14px] text-text-2">Try again from the sign in page.</p>
          <a href="/login?yapin=error" className="btn-blue mt-6">
            Sign in
          </a>
        </>
      ) : (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-divider border-t-[var(--blue)]" />
          <p className="mt-4 text-[14px] text-text-2">Signing you in…</p>
        </>
      )}
    </div>
  );
}

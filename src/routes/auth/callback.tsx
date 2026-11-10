// Where Google sign in and email confirmation links come back to: waits for the
// browser session, then goes on to the page the person was on.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { safeNext } from "@/lib/accounts/redirect";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => s as Record<string, string | undefined>,
  head: () => ({ meta: [{ title: "Signing in | sloptube" }, { name: "robots", content: "noindex" }] }),
  component: AuthCallback,
});

function storedNext(): string | null {
  try {
    const v = sessionStorage.getItem("sloptube-next");
    sessionStorage.removeItem("sloptube-next");
    return v;
  } catch {
    return null;
  }
}

function AuthCallback() {
  const search = Route.useSearch();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let done = false;
    const next = safeNext(search.next ?? storedNext());
    const go = () => {
      if (done) return;
      done = true;
      // A full load, so every page reads the new session from the start.
      window.location.replace(next);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) go();
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
    });
    const timer = window.setTimeout(() => {
      if (!done) setFailed(true);
    }, 8000);
    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [search.next]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      {failed ? (
        <>
          <p className="text-[18px] text-text">That sign in link didn&apos;t work.</p>
          <p className="mt-1 text-[14px] text-text-2">It may have expired. Try signing in again.</p>
          <a href="/login" className="btn-blue mt-6">
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

import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/store/session";
import { supabase } from "@/integrations/supabase/client";
import { installAuthFetch } from "@/lib/auth-fetch";
import { AvatarMenu } from "./AvatarMenu";
import { DbStatus } from "./DbStatus";
import { AccountCircleIcon, UploadIcon } from "./icons";
import { SignedOutMenu } from "./SignedOutMenu";
import { MessagesButton } from "./messages/MessagesButton";
import { NotificationsBell } from "./subscriptions/NotificationsBell";

const iconLink = "hidden h-10 w-10 place-items-center rounded-full text-icon hover:bg-hover sm:grid";

/**
 * Right side of the top bar. It reads the request (session cookie, flags),
 * so it sits behind a Suspense boundary and streams in. It also hands those
 * values to the browser store for the rest of the page.
 */
const rootApi = getRouteApi("__root__");

export function TopBarEnd() {
  const config = useSession((s) => s.config);
  const sessionUser = useSession((s) => s.user);
  const flags = useSession((s) => s.flags);
  const email = rootApi.useLoaderData({ select: (d) => d.session.email });
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  // The server cannot read the browser's local-storage session on first paint.
  // Keep signed-out actions hidden until that browser session has been checked.
  useEffect(() => {
    installAuthFetch();
    let live = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      if (data.session && !useSession.getState().user) {
        router.refresh();
        return;
      }
      setAuthChecked(true);
    }).catch(() => {
      if (live) setAuthChecked(true);
    });
    const { data: auth } = supabase.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      if (event === "SIGNED_IN" && session && !useSession.getState().user) {
        router.refresh();
        return;
      }
      if (event === "SIGNED_OUT" || session) setAuthChecked(true);
    });
    return () => {
      live = false;
      auth.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (sessionUser) setAuthChecked(true);
  }, [sessionUser]);

  return (
    <>
      {!config && <DbStatus />}
      {flags.upload && (
        <Link
          href={sessionUser ? "/upload" : "/login?next=/upload"}
          prefetch={false}
          aria-label="Upload"
          title="Upload"
          className={iconLink}
        >
          <UploadIcon className="h-6 w-6" />
        </Link>
      )}
      {sessionUser ? (
        <>
          <MessagesButton userId={sessionUser.id} />
          {(flags.notifications || flags.subscriptions) && <NotificationsBell />}
          <AvatarMenu user={sessionUser} email={email} />
        </>
      ) : !authChecked ? (
        <div className="h-10 w-10" aria-hidden="true" data-auth-hydrating />
      ) : (
        <>
          <SignedOutMenu />
          {flags.accounts && <SignInButton />}
        </>
      )}
    </>
  );
}

export function SignInButton() {
  return (
    <Link
      href="/login"
      aria-label="Sign in"
      className="ml-1 inline-flex h-9 shrink-0 items-center gap-2 rounded-[2px] border border-[var(--link)] px-[11px] text-[14px] font-medium uppercase text-[var(--link)]"
    >
      <AccountCircleIcon className="h-6 w-6" />
      <span className="hidden sm:inline">Sign in</span>
    </Link>
  );
}

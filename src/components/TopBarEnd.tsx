import { getRouteApi } from "@tanstack/react-router";
import Link from "next/link";
import { useSession } from "@/lib/store/session";
import { AvatarMenu } from "./AvatarMenu";
import { DbStatus } from "./DbStatus";
import { AccountCircleIcon, UploadIcon } from "./icons";
import { SignedOutMenu } from "./SignedOutMenu";
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
          {(flags.notifications || flags.subscriptions) && <NotificationsBell />}
          <AvatarMenu user={sessionUser} email={email} />
        </>
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

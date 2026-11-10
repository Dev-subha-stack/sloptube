// The session lives in the browser (local storage), so requests to this app's
// own endpoints carry it as a bearer token. Installed once on the client.
import { supabase } from "@/integrations/supabase/client";

let currentToken: string | null = null;
let installed = false;

/** The signed in person's access token, kept fresh by the auth listener. */
export function accessToken(): string | null {
  return currentToken;
}

function isOwnApi(url: URL): boolean {
  if (url.origin !== window.location.origin) return false;
  return url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/yapin");
}

export function installAuthFetch(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  void supabase.auth.getSession().then(({ data }) => {
    currentToken = data.session?.access_token ?? null;
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    currentToken = session?.access_token ?? null;
  });
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(raw, window.location.href);
      if (isOwnApi(url)) {
        if (!currentToken) {
          const { data } = await supabase.auth.getSession();
          currentToken = data.session?.access_token ?? null;
        }
        if (currentToken) {
          const headers = new Headers(input instanceof Request ? input.headers : undefined);
          if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
          if (!headers.has("authorization")) headers.set("authorization", `Bearer ${currentToken}`);
          return original(input, { ...init, headers });
        }
      }
    } catch {
      // fall through to the plain request
    }
    return original(input, init);
  };
}

/** hls.js setup: send the token with playlist and segment requests to /api/media. */
export function hlsXhrSetup(xhr: XMLHttpRequest, url: string): void {
  try {
    const u = new URL(url, window.location.href);
    if (currentToken && u.origin === window.location.origin && u.pathname.startsWith("/api/media/")) {
      xhr.setRequestHeader("Authorization", `Bearer ${currentToken}`);
    }
  } catch {
    // ignore
  }
}

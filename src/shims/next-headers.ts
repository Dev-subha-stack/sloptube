// Stand-in for the old framework's request cookies/headers, backed by the
// current TanStack Start request. Server only: call inside server functions
// and server route handlers.
import { deleteCookie, getCookie, getCookies, getRequest, setCookie } from "@tanstack/react-start/server";

type CookieOptions = {
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  maxAge?: number;
  path?: string;
  expires?: Date;
  domain?: string;
};

export async function cookies() {
  return {
    get(name: string) {
      const value = getCookie(name);
      return value === undefined ? undefined : { name, value };
    },
    getAll() {
      return Object.entries(getCookies()).map(([name, value]) => ({ name, value: String(value) }));
    },
    has(name: string) {
      return getCookie(name) !== undefined;
    },
    set(name: string, value: string, options: CookieOptions = {}) {
      setCookie(name, value, options);
    },
    delete(name: string) {
      deleteCookie(name);
    },
  };
}

export async function headers(): Promise<Headers> {
  return getRequest().headers;
}

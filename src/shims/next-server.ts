// Stand-in for the old framework's server helpers used by the ported handlers.

type CookieOptions = { path?: string; maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "lax" | "strict" | "none"; expires?: Date };

function cookieString(name: string, value: string, o: CookieOptions = {}) {
  let c = `${name}=${encodeURIComponent(value)}; Path=${o.path ?? "/"}`;
  if (o.maxAge !== undefined) c += `; Max-Age=${o.maxAge}`;
  if (o.expires) c += `; Expires=${o.expires.toUTCString()}`;
  if (o.httpOnly) c += "; HttpOnly";
  if (o.secure) c += "; Secure";
  if (o.sameSite) c += `; SameSite=${o.sameSite[0].toUpperCase()}${o.sameSite.slice(1)}`;
  return c;
}

export class NextResponse extends Response {
  /** Writes Set-Cookie headers, like the old framework's response cookies. */
  readonly cookies = {
    set: (name: string, value: string, options?: CookieOptions) => {
      this.headers.append("Set-Cookie", cookieString(name, value, options));
    },
    delete: (name: string) => {
      this.headers.append("Set-Cookie", cookieString(name, "", { maxAge: 0 }));
    },
  };

  static override json(data: unknown, init?: ResponseInit): NextResponse {
    const headers = new Headers(init?.headers);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    return new NextResponse(JSON.stringify(data), { ...init, headers });
  }
  static override redirect(url: string | URL, init?: number | ResponseInit): NextResponse {
    const status = typeof init === "number" ? init : (init?.status ?? 307);
    const headers = new Headers(typeof init === "object" ? init.headers : undefined);
    headers.set("Location", String(url));
    return new NextResponse(null, { status, headers });
  }
  static next(): NextResponse {
    return new NextResponse(null, { status: 200 });
  }
}

type RequestCookies = {
  get(name: string): { name: string; value: string } | undefined;
  getAll(): { name: string; value: string }[];
  has(name: string): boolean;
};

export type NextRequest = Request & { nextUrl: URL; cookies: RequestCookies };

/** Runs one of the original route handlers for a server route request. */
export function callHandler(fn: unknown, request: Request, params: Promise<Record<string, unknown>>): Promise<Response> {
  return Promise.resolve((fn as (req: NextRequest, ctx: { params: typeof params }) => Response | Promise<Response>)(toNextRequest(request), { params }));
}


/** Opts out of static rendering in the old framework. Nothing to do here. */
export async function connection(): Promise<void> {}

export function after(fn: () => unknown): void {
  void Promise.resolve().then(fn).catch(() => {});
}

/** Wraps a fetch Request with the extra fields the old handlers read. */
export function toNextRequest(request: Request): NextRequest {
  const r = request as NextRequest;
  const url = new URL(request.url);
  const cookieHeader = request.headers.get("cookie") ?? "";
  const jar = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) jar.set(part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1).trim()));
  }
  Object.defineProperty(r, "nextUrl", { value: url, configurable: true });
  Object.defineProperty(r, "cookies", {
    value: {
      get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      has: (name: string) => jar.has(name),
    },
    configurable: true,
  });
  return r;
}

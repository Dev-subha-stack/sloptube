// Per-request memoization for server helpers (the old framework's React cache()).
// Keyed by the current request, so nothing leaks between visitors. Outside a
// request (or in the browser) it simply calls through.
import { getRequest } from "@tanstack/react-start/server";

const store = new WeakMap<object, Map<unknown, Map<string, unknown>>>();

function currentRequest(): object | null {
  if (typeof window !== "undefined") return null;
  try {
    return (getRequest() as object | undefined) ?? null;
  } catch {
    return null;
  }
}

export function cache<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  return (...args: A): R => {
    const req = currentRequest();
    if (!req) return fn(...args);
    let fns = store.get(req);
    if (!fns) store.set(req, (fns = new Map()));
    let calls = fns.get(fn);
    if (!calls) fns.set(fn, (calls = new Map()));
    const key = JSON.stringify(args);
    if (calls.has(key)) return calls.get(key) as R;
    const out = fn(...args);
    calls.set(key, out);
    return out;
  };
}

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import { readSupabaseConfig } from "./env";

function isOpaqueKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function keyFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (isOpaqueKey(key) && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

/** The signed in person's access token from the current request, if any. */
export function requestAccessToken(): string | null {
  try {
    const auth = getRequest()?.headers.get("authorization") ?? "";
    const m = /^Bearer\s+(.+)$/i.exec(auth);
    return m ? m[1]!.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Backend client for server functions and server routes, acting as the
 * person who made the request (their bearer token), or anonymous without one.
 * RLS applies. Returns null when the backend is not configured. `headers`
 * go on every request it makes (search sends the visitor's address).
 */
export async function createClient(opts: { headers?: Record<string, string> } = {}): Promise<SupabaseClient | null> {
  const config = readSupabaseConfig();
  if (!config) return null;
  const token = requestAccessToken();
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return createSupabaseClient(config.url, config.key, {
    global: { headers, fetch: keyFetch(config.key) },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storage: undefined },
  });
}

/** A plain anonymous client (no session), for public reads. Null without settings. */
export function anonClient(): SupabaseClient | null {
  const config = readSupabaseConfig();
  if (!config) return null;
  return createSupabaseClient(config.url, config.key, {
    global: { fetch: keyFetch(config.key) },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storage: undefined },
  });
}

/** A privileged client with the given server key (service role). Server only, never for browser input as is. */
export function keyedClient(key: string): SupabaseClient | null {
  const config = readSupabaseConfig();
  if (!config) return null;
  return createSupabaseClient(config.url, key, {
    global: { fetch: keyFetch(key) },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storage: undefined },
  });
}

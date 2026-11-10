export type SupabaseConfig = { url: string; key: string };

/**
 * The backend settings. On the server they come from the runtime env (read
 * at call time, never at module scope); in the browser from the build.
 */
export function readSupabaseConfig(): SupabaseConfig | null {
  if (typeof window === "undefined" && typeof process !== "undefined") {
    const url = process.env["SUPABASE_URL"]?.trim();
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]?.trim();
    if (url && key) return { url, key };
  }
  const url = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined)?.trim();
  const key = (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined)?.trim();
  if (!url || !key) return null;
  return { url, key };
}

/** The browser-facing settings, safe to hand to the client. */
export function readPublicSupabaseConfig(): SupabaseConfig | null {
  const url = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined)?.trim();
  const key = (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined)?.trim();
  if (!url || !key) return null;
  return { url, key };
}

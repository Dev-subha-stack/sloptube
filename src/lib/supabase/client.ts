import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** The browser backend client (session in local storage, works in the editor preview). */
export function createClient(): SupabaseClient {
  return supabase as unknown as SupabaseClient;
}

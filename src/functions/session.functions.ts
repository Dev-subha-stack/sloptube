// What every page needs about the visitor: backend settings, the signed in
// person, evaluated flags, the admin flag panel and maintenance/ban state.
// Called by the root route's loader. During server rendering there is no
// session (it lives in the browser), so it answers for a signed out visitor;
// the browser calls it again with the session once it has loaded.
import { createServerFn } from "@tanstack/react-start";

export const getSessionState = createServerFn({ method: "GET" }).handler(async () => {
  const { getCurrentUser, toSessionUser } = await import("@/lib/auth");
  const { evaluateAllFlags, getFlags } = await import("@/lib/flags");
  const { readPublicSupabaseConfig } = await import("@/lib/supabase/env");
  const { createClient } = await import("@/lib/supabase/server");
  const { evaluateFlag } = await import("@/lib/flags-core");
  const { flagPanelOn, panelFlagStates } = await import("@/lib/flag-panel-server");

  const config = readPublicSupabaseConfig();
  const user = config ? await getCurrentUser() : null;
  const flags = config ? await evaluateAllFlags(user?.id ?? null) : {};

  let admin = false;
  let banned = false;
  if (user) {
    const supabase = await createClient();
    if (supabase) {
      const [{ data: isAdmin }, { data: profile }] = await Promise.all([
        supabase.rpc("is_admin"),
        supabase.from("profiles").select("banned_at").eq("id", user.id).maybeSingle(),
      ]);
      admin = isAdmin === true;
      banned = Boolean((profile as { banned_at?: string | null } | null)?.banned_at);
    }
  }

  let maintenance = false;
  if (config) {
    const { flags: rows } = await getFlags();
    const row = rows.find((f) => f.key === "maintenance");
    maintenance = evaluateFlag(row, user?.id ?? null) && !admin;
  }

  let flagPanel = null as Awaited<ReturnType<typeof panelFlagStates>> | null;
  if (user && admin) {
    const gate = await flagPanelOn();
    if (!("error" in gate)) flagPanel = await panelFlagStates(gate.userId);
  }

  return {
    config,
    user: user ? toSessionUser(user) : null,
    email: user?.email ?? null,
    flags,
    admin,
    banned,
    maintenance,
    flagPanel,
  };
});

export type SessionState = Awaited<ReturnType<typeof getSessionState>>;

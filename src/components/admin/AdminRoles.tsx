"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PERMISSIONS, roleProblem } from "@/lib/admin/permissions";
import { CustomRoleBadge } from "./RoleBadge";
import { useStaff } from "@/lib/store/staff";
import { useSession } from "@/lib/store/session";
import { card } from "./AdminShell";

type Role = { id: string; name: string; color: string; show_badge: boolean; permissions: string[]; sort_order: number };
type Member = { role_id: string; user_id: string; profile: { username: string; display_name: string } | null };

const field = "mt-1 block w-full rounded-[4px] border border-[var(--input-border)] bg-transparent px-3 py-2 text-[14px] text-text outline-none focus:border-[var(--focus)]";

const CustomBadge = CustomRoleBadge;

const blank = { id: "", name: "", color: "#7c3aed", show_badge: true, permissions: [] as string[], sort_order: 0 };

/** Admin > Roles & badges: make roles with a badge colour and powers, and give them to people. */
export function AdminRoles() {
  const user = useSession((s) => s.user);
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [draft, setDraft] = useState<Role>(blank);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, setAdding] = useState<Record<string, string>>({});
  const reloadBadges = useStaff((s) => s.reload);

  const refresh = useCallback(async () => {
    const [r, m] = await Promise.all([
      supabase.from("custom_roles").select("id, name, color, show_badge, permissions, sort_order").order("sort_order").order("name"),
      supabase.from("user_custom_roles").select("role_id, user_id, profile:profiles!user_custom_roles_user_id_fkey(username, display_name)"),
    ]);
    setRoles((r.data ?? []) as Role[]);
    setMembers((m.data ?? []) as unknown as Member[]);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy || !user) return;
    const problem = roleProblem(draft.name, draft.color);
    if (problem) return setMessage({ ok: false, text: problem });
    setBusy(true);
    setMessage(null);
    const row = { name: draft.name.trim(), color: draft.color.toLowerCase(), show_badge: draft.show_badge, permissions: draft.permissions, sort_order: draft.sort_order };
    const { error } = draft.id
      ? await supabase.from("custom_roles").update(row).eq("id", draft.id)
      : await supabase.from("custom_roles").insert({ ...row, created_by: user.id });
    setBusy(false);
    if (error) return setMessage({ ok: false, text: error.code === "23505" ? "A role with that name already exists." : "Only admins can change roles." });
    setMessage({ ok: true, text: draft.id ? "Role saved." : "Role created. Give it to people below." });
    setDraft(blank);
    void refresh();
    reloadBadges();
  }

  async function remove(r: Role) {
    if (!window.confirm(`Delete the role "${r.name}"? Everyone who has it loses it.`)) return;
    await supabase.from("custom_roles").delete().eq("id", r.id);
    if (draft.id === r.id) setDraft(blank);
    void refresh();
    reloadBadges();
  }

  async function give(r: Role) {
    const name = (adding[r.id] ?? "").trim().replace(/^@/, "").toLowerCase();
    if (!name || !user) return;
    const { data: p } = await supabase.from("profiles").select("id").eq("username", name).maybeSingle();
    if (!p) return setMessage({ ok: false, text: `Nobody is called @${name}.` });
    const { error } = await supabase.from("user_custom_roles").insert({ user_id: (p as { id: string }).id, role_id: r.id, assigned_by: user.id });
    if (error && error.code !== "23505") return setMessage({ ok: false, text: "Only admins can give roles." });
    setAdding((a) => ({ ...a, [r.id]: "" }));
    setMessage({ ok: true, text: `@${name} is now ${r.name}.` });
    void refresh();
    reloadBadges();
  }

  async function take(m: Member) {
    await supabase.from("user_custom_roles").delete().eq("user_id", m.user_id).eq("role_id", m.role_id);
    void refresh();
    reloadBadges();
  }

  const togglePerm = (key: string) =>
    setDraft((d) => ({ ...d, permissions: d.permissions.includes(key) ? d.permissions.filter((p) => p !== key) : [...d.permissions, key] }));

  return (
    <div data-admin-roles>
      <form onSubmit={save} className={`${card} p-4 sm:p-5`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-medium text-text">{draft.id ? `Edit ${draft.name || "role"}` : "New role"}</h2>
          <span className="text-[13px] text-text-2">
            Preview: <span className="text-text">{user?.displayName ?? "Name"}</span>
            <CustomBadge name={draft.name.trim() || "Badge"} color={draft.color} />
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <label className="block text-[13px] text-text-2">
            Name
            <input value={draft.name} maxLength={30} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Helper" className={field} aria-label="Role name" />
          </label>
          <label className="block text-[13px] text-text-2">
            Badge colour
            <span className="mt-1 flex items-center gap-2">
              <input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} aria-label="Badge colour" className="h-9 w-12 cursor-pointer rounded-[4px] bg-transparent" />
              <input value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} className="w-[90px] rounded-[4px] border border-[var(--input-border)] bg-transparent px-2 py-2 text-[13px] text-text" aria-label="Badge colour code" />
            </span>
          </label>
          <label className="block text-[13px] text-text-2">
            Order
            <input type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })} className={`${field} w-[80px]`} aria-label="Badge order" />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-[14px] text-text">
          <input type="checkbox" checked={draft.show_badge} onChange={(e) => setDraft({ ...draft, show_badge: e.target.checked })} className="h-4 w-4 accent-[var(--link)]" />
          Show the badge next to their name
        </label>
        <fieldset className="mt-4">
          <legend className="text-[13px] text-text-2">Powers (leave all off for a badge only)</legend>
          <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {PERMISSIONS.map((p) => (
              <label key={p.key} className="flex items-center gap-2 rounded-[2px] px-1 py-1 text-[14px] text-text hover:bg-hover">
                <input type="checkbox" checked={draft.permissions.includes(p.key)} onChange={() => togglePerm(p.key)} className="h-4 w-4 accent-[var(--link)]" data-perm={p.key} />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy} className="btn-blue">
            {draft.id ? "Save role" : "Create role"}
          </button>
          {draft.id && (
            <button type="button" onClick={() => setDraft(blank)} className="btn-text">
              Cancel
            </button>
          )}
          {message && (
            <p role="status" className={`text-[13px] ${message.ok ? "text-text-2" : "text-[var(--error)]"}`}>
              {message.text}
            </p>
          )}
        </div>
      </form>

      <h2 className="mb-3 mt-8 text-[16px] font-medium text-text">Roles</h2>
      {roles === null ? (
        <p className="text-[14px] text-text-2">Loading...</p>
      ) : roles.length === 0 ? (
        <p className="text-[14px] text-text-2">No custom roles yet. Admins (blue) and moderators (green) are built in.</p>
      ) : (
        <div className="space-y-3">
          {roles.map((r) => {
            const people = members.filter((m) => m.role_id === r.id);
            return (
              <div key={r.id} className={`${card} p-4`} data-role-row={r.name}>
                <div className="flex flex-wrap items-center gap-2">
                  <CustomBadge name={r.name} color={r.color} />
                  {!r.show_badge && <span className="text-[12px] text-text-3">badge hidden</span>}
                  <span className="text-[12px] text-text-2">
                    {r.permissions.length ? PERMISSIONS.filter((p) => r.permissions.includes(p.key)).map((p) => p.label).join(", ") : "Badge only, no powers"}
                  </span>
                  <span className="ml-auto flex gap-1">
                    <button type="button" onClick={() => setDraft(r)} className="btn-text !px-2">
                      Edit
                    </button>
                    <button type="button" onClick={() => void remove(r)} className="btn-text !px-2 !text-[var(--error)]">
                      Delete
                    </button>
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {people.map((m) => (
                    <span key={m.user_id} className="inline-flex items-center gap-1 rounded-full bg-[var(--hover)] py-1 pl-3 pr-1 text-[13px] text-text" data-role-member={m.profile?.username}>
                      @{m.profile?.username ?? "unknown"}
                      <button type="button" onClick={() => void take(m)} aria-label={`Take ${r.name} from @${m.profile?.username}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-[var(--active)]">
                        ×
                      </button>
                    </span>
                  ))}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void give(r);
                    }}
                    className="flex items-center gap-1"
                  >
                    <input
                      value={adding[r.id] ?? ""}
                      onChange={(e) => setAdding((a) => ({ ...a, [r.id]: e.target.value }))}
                      placeholder="@username"
                      aria-label={`Give ${r.name} to`}
                      className="w-[150px] rounded-[4px] border border-[var(--input-border)] bg-transparent px-2 py-1 text-[13px] text-text outline-none focus:border-[var(--focus)]"
                    />
                    <button type="submit" className="btn-text !px-2">
                      Give
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

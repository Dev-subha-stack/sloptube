"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { StaffBadge } from "@/components/admin/RoleBadge";
import { Avatar } from "@/components/Avatar";
import { ChatIcon, SendIcon } from "@/components/icons";
import { EmojiPicker, EmojiProvider, EmojiText } from "@/components/emojis/EmojiContext";
import { supabase } from "@/integrations/supabase/client";
import { DM_MAX, DM_REACTIONS, dmErrorText, dmProblem, nextReaction, reactionChips } from "@/lib/messages/rules";
import { useDmUnread } from "@/lib/store/dms";
import { useSession } from "@/lib/store/session";
import { parseUtc, timeAgo } from "@/lib/watch/format";

type Conversation = {
  other_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  last_body: string;
  last_at: string;
  last_from_me: boolean;
  unread: number;
};
type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  reactions: Record<string, string> | null;
};
const MESSAGE_COLUMNS = "id, sender_id, recipient_id, body, created_at, read_at, edited_at, deleted_at, reactions";
type Person = { id: string; username: string; display_name: string; avatar_url: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function NewChat({ onPick }: { onPick: (p: Person) => void }) {
  const me = useSession((s) => s.user);
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  useEffect(() => {
    const term = q.trim().replace(/^@/, "");
    if (term.length < 2) return setPeople([]);
    const t = setTimeout(async () => {
      const safe = term.replace(/[%_,()]/g, "");
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.${safe}%,display_name.ilike.${safe}%`)
        .eq("onboarded", true)
        .neq("id", me?.id ?? "")
        .limit(8);
      setPeople((data ?? []) as Person[]);
    }, 200);
    return () => clearTimeout(t);
  }, [q, me?.id]);
  return (
    <div className="relative border-b border-divider p-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="New message: search people"
        aria-label="Search people to message"
        className="block w-full rounded-full border border-[var(--input-border)] bg-transparent px-4 py-2 text-[14px] text-text outline-none focus:border-[var(--focus)]"
      />
      {people.length > 0 && (
        <div className="anim-in absolute inset-x-3 top-[52px] z-20 overflow-hidden rounded-[8px] bg-surface shadow-[var(--menu-shadow)]" role="listbox">
          {people.map((p) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => {
                setQ("");
                setPeople([]);
                onPick(p);
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-hover"
              data-dm-person={p.username}
            >
              <Avatar name={p.display_name} url={p.avatar_url} size={32} />
              <span className="min-w-0">
                <span className="block truncate text-[14px] text-text">{p.display_name}</span>
                <span className="block truncate text-[12px] text-text-2">@{p.username}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  m,
  me,
  active,
  onToggle,
  onChanged,
  onError,
}: {
  m: Message;
  me: string;
  active: boolean;
  onToggle: () => void;
  onChanged: (m: Message) => void;
  onError: (text: string) => void;
}) {
  const mine = m.sender_id === me;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.body);
  const [picker, setPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const chips = reactionChips(m.reactions, me);
  const myReaction = m.reactions?.[me] ?? null;

  useEffect(() => {
    if (!active) {
      setPicker(false);
      setConfirmDelete(false);
    }
  }, [active]);

  async function run(call: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
    setBusy(true);
    const { data, error } = await call;
    setBusy(false);
    if (error) {
      const text = dmErrorText(error.message);
      onError(text.startsWith("The message didn't send") ? "That didn't work. Try again." : text);
      return false;
    }
    if (data) onChanged(data as Message);
    return true;
  }

  const react = (emoji: string) => {
    setPicker(false);
    void run(supabase.rpc("dm_react", { _id: m.id, _emoji: nextReaction(myReaction, emoji) ?? "" }));
  };

  async function saveEdit(e?: FormEvent) {
    e?.preventDefault();
    const problem = dmProblem(text);
    if (problem) return onError(problem);
    if (await run(supabase.rpc("dm_edit", { _id: m.id, _body: text.trim() }))) {
      setEditing(false);
      onToggle();
    }
  }

  if (m.deleted_at) {
    return (
      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <p className="max-w-[78%] rounded-[18px] border border-divider px-3.5 py-2 text-[13px] italic text-text-3" data-dm-message="deleted">
          Message deleted
        </p>
      </div>
    );
  }

  if (editing) {
    return (
      <form onSubmit={saveEdit} className="flex justify-end" data-dm-editing>
        <div className="w-full max-w-[78%]">
          <textarea
            value={text}
            maxLength={DM_MAX}
            autoFocus
            rows={2}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void saveEdit();
              }
              if (e.key === "Escape") setEditing(false);
            }}
            aria-label="Edit message"
            className="block w-full resize-none rounded-[14px] border border-[var(--focus)] bg-transparent px-3 py-2 text-[14px] text-text outline-none"
          />
          <div className="mt-1 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="rounded-full px-3 py-1 text-[13px] text-text hover:bg-hover">
              Cancel
            </button>
            <button type="submit" disabled={busy || !text.trim()} className="rounded-full bg-[var(--link)] px-3 py-1 text-[13px] font-medium text-white disabled:opacity-40">
              Save
            </button>
          </div>
        </div>
      </form>
    );
  }

  const tool = "grid h-8 min-w-8 place-items-center rounded-full px-2 text-[13px] text-text hover:bg-hover disabled:opacity-40";
  return (
    <div className={`group flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <div className={`flex w-full items-center gap-1 ${mine ? "flex-row-reverse" : ""}`}>
        <p
          onClick={onToggle}
          className={`anim-in max-w-[78%] cursor-pointer whitespace-pre-wrap break-words rounded-[18px] px-3.5 py-2 text-[14px] leading-5 ${
            mine ? "rounded-br-[6px] bg-[var(--link)] text-white [&_a]:text-white [&_a]:underline" : "rounded-bl-[6px] bg-[var(--hover)] text-text"
          }`}
          data-dm-message={mine ? "mine" : "theirs"}
        >
          <EmojiText text={m.body} />
          {m.edited_at && <span className={`ml-1.5 text-[11px] ${mine ? "opacity-75" : "text-text-3"}`}>(edited)</span>}
        </p>
        <div className={`${active ? "flex" : "hidden [@media(hover:hover)]:group-hover:flex"} shrink-0 items-center gap-0.5`} data-dm-actions>
          <button type="button" aria-label="React" onClick={() => setPicker((v) => !v)} className={tool} disabled={busy}>
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm-3.5-9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM12 17.5c2.3 0 4.3-1.4 5.1-3.5H6.9c.8 2.1 2.8 3.5 5.1 3.5Z" />
            </svg>
          </button>
          {mine && (
            <>
              <button
                type="button"
                onClick={() => {
                  setText(m.body);
                  setEditing(true);
                }}
                className={tool}
                disabled={busy}
              >
                Edit
              </button>
              {confirmDelete ? (
                <>
                  <button type="button" onClick={() => void run(supabase.rpc("dm_delete", { _id: m.id }))} className={`${tool} font-medium text-[var(--error)]`} disabled={busy}>
                    Delete?
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className={tool}>
                    No
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className={tool} disabled={busy}>
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {picker && (
        <div className="anim-in mt-1 flex gap-0.5 rounded-full bg-surface px-1.5 py-1 shadow-[var(--menu-shadow)]" role="menu" aria-label="Pick a reaction">
          {DM_REACTIONS.map((e) => (
            <button
              key={e}
              type="button"
              role="menuitem"
              onClick={() => react(e)}
              aria-label={`React ${e}`}
              className={`grid h-9 w-9 place-items-center rounded-full text-[20px] transition-transform hover:scale-125 ${myReaction === e ? "bg-[var(--active)]" : ""}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
      {chips.length > 0 && (
        <div className="-mt-1 flex gap-1 px-2" data-dm-reactions>
          {chips.map((c) => (
            <button
              key={c.emoji}
              type="button"
              onClick={() => react(c.emoji)}
              aria-label={`${c.emoji} ${c.count}${c.mine ? ", yours" : ""}`}
              className={`flex h-6 items-center gap-1 rounded-full border px-1.5 text-[12px] text-text ${c.mine ? "border-[var(--link)] bg-[var(--active)]" : "border-divider bg-surface"}`}
            >
              <span>{c.emoji}</span>
              {c.count > 1 && <span>{c.count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** /messages: conversations on the left, the open chat on the right (one at a time on phones). */
function MessagesContent() {
  const me = useSession((s) => s.user);
  const loaded = useSession((s) => s.loaded);
  const router = useRouter();
  const params = useSearchParams();
  const to = params.get("to");
  const otherId = to && UUID.test(to) ? to : null;
  const refreshBadge = useDmUnread((s) => s.refresh);

  const [convos, setConvos] = useState<Conversation[] | null>(null);
  const [other, setOther] = useState<Person | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [activeId, setActiveId] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const otherRef = useRef<string | null>(null);
  otherRef.current = otherId;

  const loadConvos = useCallback(async () => {
    const { data } = await supabase.rpc("dm_conversations");
    setConvos((data ?? []) as Conversation[]);
    setNow(Date.now());
  }, []);

  const loadThread = useCallback(
    async (id: string) => {
      if (!me) return;
      const [{ data: person }, { data: rows }] = await Promise.all([
        supabase.from("profiles").select("id, username, display_name, avatar_url").eq("id", id).maybeSingle(),
        supabase
          .from("direct_messages")
          .select(MESSAGE_COLUMNS)
          .or(`and(sender_id.eq.${me.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${me.id})`)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      if (otherRef.current !== id) return;
      setOther((person as Person | null) ?? null);
      setMessages(((rows ?? []) as Message[]).reverse());
      const { data: marked } = await supabase.rpc("dm_mark_read", { other: id });
      if (Number(marked) > 0) {
        void refreshBadge();
        void loadConvos();
      }
    },
    [me, refreshBadge, loadConvos],
  );

  useEffect(() => {
    if (me) void loadConvos();
  }, [me, loadConvos]);

  useEffect(() => {
    setMessages(null);
    setOther(null);
    setError(null);
    setActiveId(null);
    if (otherId) void loadThread(otherId);
  }, [otherId, loadThread]);

  // New messages arrive live; the database only sends this person's own.
  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel(`dm-view-${me.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        const m = payload.new as Message;
        const current = otherRef.current;
        if (current && (m.sender_id === current || m.recipient_id === current)) {
          setMessages((list) => (list && !list.some((x) => x.id === m.id) ? [...list, m] : list));
          if (m.sender_id === current) void supabase.rpc("dm_mark_read", { other: current }).then(() => void refreshBadge());
        }
        void loadConvos();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, (payload) => {
        const m = payload.new as Message;
        setMessages((list) => (list ? list.map((x) => (x.id === m.id ? { ...x, ...m } : x)) : list));
        if (m.deleted_at || m.edited_at) void loadConvos();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me, loadConvos, refreshBadge]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!me || !otherId || sending) return;
    const problem = dmProblem(draft);
    if (problem) return setError(problem);
    setSending(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("direct_messages")
      .insert({ sender_id: me.id, recipient_id: otherId, body: draft.trim() })
      .select(MESSAGE_COLUMNS)
      .single();
    setSending(false);
    if (err) return setError(dmErrorText(err.message));
    setDraft("");
    setMessages((list) => (list && data && !list.some((x) => x.id === (data as Message).id) ? [...list, data as Message] : list));
    void loadConvos();
  }

  if (loaded && !me) {
    return (
      <div className="flex flex-col items-center px-6 py-20 text-center" data-dm-state="signed-out">
        <ChatIcon className="h-[96px] w-[96px] text-text-3" />
        <h1 className="mt-6 text-[24px] text-text">Messages</h1>
        <p className="mt-2 text-[14px] text-text-2">Sign in to message other people on sloptube.</p>
        <Link href="/login?next=%2Fmessages" className="btn-blue mt-6">
          Sign in
        </Link>
      </div>
    );
  }

  const open = (id: string) => router.push(`/messages?to=${id}`, { scroll: false });

  return (
    <div className="mx-auto flex h-[calc(100dvh-56px)] max-w-[1100px] overflow-hidden bg-surface sm:my-4 sm:h-[calc(100dvh-88px)] sm:rounded-[12px] sm:border sm:border-divider" data-dm-view>
      <aside className={`w-full shrink-0 flex-col border-divider sm:flex sm:w-[320px] sm:border-r ${otherId ? "hidden" : "flex"}`}>
        <h1 className="px-4 pb-1 pt-4 text-[20px] text-text">Messages</h1>
        <NewChat onPick={(p) => open(p.id)} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {convos === null && <p className="p-4 text-[14px] text-text-2">Loading...</p>}
          {convos?.length === 0 && <p className="p-4 text-[14px] text-text-2">No messages yet. Search for someone above to start a chat.</p>}
          {convos?.map((c) => (
            <button
              key={c.other_id}
              type="button"
              onClick={() => open(c.other_id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-hover ${otherId === c.other_id ? "bg-[var(--active)]" : ""}`}
              data-dm-convo={c.username}
            >
              <Avatar name={c.display_name} url={c.avatar_url} size={44} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className={`min-w-0 flex-1 truncate text-[14px] text-text ${c.unread ? "font-medium" : ""}`}>{c.display_name}</span>
                  <span className="shrink-0 text-[12px] text-text-2">{timeAgo(c.last_at, now)}</span>
                </span>
                <span className={`block truncate text-[13px] ${c.unread ? "font-medium text-text" : "text-text-2"}`}>
                  {c.last_from_me ? "You: " : ""}
                  <EmojiText text={c.last_body} />
                </span>
              </span>
              {c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--link)] px-1 text-[11px] font-medium text-white">{c.unread}</span>}
            </button>
          ))}
        </div>
      </aside>

      <section className={`min-w-0 flex-1 flex-col ${otherId ? "flex" : "hidden sm:flex"}`}>
        {!otherId ? (
          <div className="m-auto px-6 text-center text-text-2">
            <ChatIcon className="mx-auto h-16 w-16 text-text-3" />
            <p className="mt-3 text-[14px]">Pick a chat or start a new one.</p>
          </div>
        ) : (
          <>
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-divider px-2 sm:px-4">
              <button type="button" onClick={() => router.push("/messages")} aria-label="Back to chats" className="grid h-10 w-10 place-items-center rounded-full text-icon hover:bg-hover sm:hidden">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
              </button>
              {other ? (
                <Link href={`/@${other.username}`} className="flex min-w-0 items-center gap-3">
                  <Avatar name={other.display_name} url={other.avatar_url} size={32} />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium text-text">
                      {other.display_name}
                      <StaffBadge name={other.username} />
                    </span>
                    <span className="block truncate text-[12px] text-text-2">@{other.username}</span>
                  </span>
                </Link>
              ) : (
                <span className="h-4 w-32 bg-skeleton" />
              )}
            </header>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6" data-dm-thread>
              {messages === null && <p className="text-center text-[14px] text-text-2">Loading...</p>}
              {messages?.length === 0 && <p className="text-center text-[14px] text-text-2">Say hi to {other?.display_name ?? "them"}.</p>}
              {messages?.map((m, i) => {
                const prev = messages[i - 1];
                const gap = !prev || parseUtc(m.created_at) - parseUtc(prev.created_at) > 10 * 60_000;
                return (
                  <div key={m.id}>
                    {gap && <p className="py-2 text-center text-[11px] text-text-3">{timeAgo(m.created_at, now)}</p>}
                    {me && (
                      <MessageBubble
                        m={m}
                        me={me.id}
                        active={activeId === m.id}
                        onToggle={() => setActiveId((a) => (a === m.id ? null : m.id))}
                        onChanged={(next) => {
                          setError(null);
                          setMessages((list) => (list ? list.map((x) => (x.id === next.id ? next : x)) : list));
                          if (next.deleted_at || next.edited_at) void loadConvos();
                        }}
                        onError={setError}
                      />
                    )}
                  </div>
                );
              })}
              <div ref={bottom} />
            </div>
            <form onSubmit={send} className="flex shrink-0 items-end gap-2 border-t border-divider p-2 sm:p-3">
              <EmojiPicker
                onPick={(code) => setDraft((current) => (current && !/\s$/.test(current) ? current + " " + code : current + code))}
              />
              <textarea
                value={draft}
                maxLength={DM_MAX}
                rows={1}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Write a message"
                aria-label="Message"
                className="max-h-32 min-h-10 flex-1 resize-none rounded-[20px] border border-[var(--input-border)] bg-transparent px-4 py-2 text-[14px] text-text outline-none focus:border-[var(--focus)]"
              />
              <button type="submit" disabled={sending || !draft.trim()} aria-label="Send" className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--link)] text-white disabled:opacity-40">
                <SendIcon className="h-5 w-5" />
              </button>
            </form>
            {error && <p role="alert" className="px-4 pb-2 text-[13px] text-[var(--error)]">{error}</p>}
          </>
        )}
      </section>
    </div>
  );
}


/** Direct messages use the same publicly shared channel emoji library as video comments. */
export function MessagesView() {
  return (
    <EmojiProvider>
      <MessagesContent />
    </EmojiProvider>
  );
}

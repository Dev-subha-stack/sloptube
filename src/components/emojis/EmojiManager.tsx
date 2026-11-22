"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/store/session";
import { EMOJI_BUCKET, EMOJI_MAX, EMOJI_SIZE_PX, cleanEmojiName, emojiNameProblem, emojiUrl } from "@/lib/emojis/rules";

type Emoji = { id: string; name: string; image_path: string };

const card = "rounded-[2px] bg-surface shadow-[0_0_0_1px_var(--divider)]";

/** Scales the picture into a 64 px square (keeping its shape, transparent edges) as WebP or PNG. */
async function shrink(file: File): Promise<Blob> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error("Pick a PNG, JPG, WebP or GIF picture.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Pictures can be up to 5 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(EMOJI_SIZE_PX / bitmap.width, EMOJI_SIZE_PX / bitmap.height);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = EMOJI_SIZE_PX;
  canvas.height = EMOJI_SIZE_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read the picture.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (EMOJI_SIZE_PX - w) / 2, (EMOJI_SIZE_PX - h) / 2, w, h);
  bitmap.close();
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.9));
  if (webp && webp.type === "image/webp") return webp;
  const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!png) throw new Error("Could not read the picture.");
  return png;
}

/** Studio > Emojis: the channel's own emojis, used as :name: in comments on its videos. */
export function EmojiManager() {
  const user = useSession((s) => s.user);
  const [channelId, setChannelId] = useState<string | null | undefined>(undefined);
  const [channelHandle, setChannelHandle] = useState<string | null>(null);
  const [emojis, setEmojis] = useState<Emoji[] | null>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setPreviewUrl(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const refresh = useCallback(async (channel: string) => {
    const { data } = await supabase.from("channel_emojis").select("id, name, image_path").eq("channel_id", channel).order("name");
    setEmojis((data ?? []) as Emoji[]);
  }, []);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("channels")
      .select("id, handle")
      .eq("owner_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { id?: string; handle?: string } | null;
        const id = row?.id ?? null;
        setChannelId(id);
        setChannelHandle(row?.handle ?? null);
        if (id) void refresh(id);
      });
  }, [user, refresh]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!user || !channelId || busy) return;
    const clean = cleanEmojiName(name);
    const problem = emojiNameProblem(clean);
    if (problem) return setMessage({ ok: false, text: problem });
    if (!file) return setMessage({ ok: false, text: "Pick a picture for the emoji." });
    if (emojis?.some((x) => x.name === clean)) return setMessage({ ok: false, text: `You already have :${clean}:.` });
    setBusy(true);
    setMessage(null);
    try {
      const blob = await shrink(file);
      const path = `${user.id}/${Date.now()}.${blob.type === "image/webp" ? "webp" : "png"}`;
      const up = await supabase.storage.from(EMOJI_BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
      if (up.error) throw new Error("The picture could not be uploaded.");
      const { error } = await supabase.from("channel_emojis").insert({ channel_id: channelId, owner_id: user.id, name: clean, image_path: path });
      if (error) {
        await supabase.storage.from(EMOJI_BUCKET).remove([path]);
        throw new Error(error.message.includes("too_many") ? `A channel can have up to ${EMOJI_MAX} emojis.` : "The emoji could not be saved.");
      }
      setName("");
      setFile(null);
      if (input.current) input.current.value = "";
      setMessage({ ok: true, text: `Added :${clean}:. Type it in a comment on your videos, or pick it from the smiley button.` });
      void refresh(channelId);
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "That didn't work." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(emoji: Emoji) {
    if (!channelId) return;
    setBusy(true);
    const { error } = await supabase.from("channel_emojis").delete().eq("id", emoji.id);
    if (!error) await supabase.storage.from(EMOJI_BUCKET).remove([emoji.image_path]);
    setBusy(false);
    if (error) return setMessage({ ok: false, text: "The emoji could not be removed." });
    void refresh(channelId);
  }

  if (!user) return null;
  if (channelId === undefined) return <p className="text-[14px] text-text-2">Loading...</p>;
  if (channelId === null)
    return (
      <p className={`${card} px-6 py-10 text-center text-[14px] text-text-2`}>
        You need a channel first. <Link href="/studio/channel" className="text-[var(--link)]">Set it up</Link>.
      </p>
    );

  return (
    <div data-emoji-manager>
      <form onSubmit={add} className={`${card} flex flex-wrap items-end gap-3 px-4 py-4 sm:px-6`}>
        <label className="block">
          <span className="text-[13px] text-text-2">Name</span>
          <span className="mt-1 flex items-center rounded-[4px] border border-[var(--input-border)] px-2 focus-within:border-[var(--focus)]">
            <span className="text-text-2">:</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={34}
              placeholder="party_cat"
              aria-label="Emoji name"
              className="w-[160px] bg-transparent px-1 py-2 text-[14px] text-text outline-none"
            />
            <span className="text-text-2">:</span>
          </span>
        </label>
        <label className="block">
          <span className="text-[13px] text-text-2">Picture</span>
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            aria-label="Emoji picture"
            className="mt-1 block text-[13px] text-text"
          />
        </label>
        {previewUrl && (
          <div className="anim-in flex items-center gap-3 rounded-[8px] bg-[var(--hover)] px-3 py-2" data-emoji-upload-preview>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="h-12 w-12 object-contain" />
            <span className="text-[13px] text-text-2">
              Preview: <span className="text-text">Nice video </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="inline-block h-6 w-6 align-text-bottom" />
              <span className="ml-1 text-text">:{cleanEmojiName(name) || "name"}:</span>
            </span>
          </div>
        )}
        <button type="submit" disabled={busy} className="btn-blue">
          {busy ? "Adding..." : "Add emoji"}
        </button>
        {message && (
          <p className={`basis-full text-[13px] ${message.ok ? "text-text-2" : "text-[var(--error)]"}`} role="status">
            {message.text}
          </p>
        )}
      </form>

      <p className="mt-4 max-w-2xl text-[13px] leading-5 text-text-2">
        Your channel emojis are available in public video comments and Direct Messages. In other channels and DMs, use the shared code
        {" "}<code className="rounded bg-hover px-1 py-0.5 text-text">:{channelHandle ?? "channel"}_emoji_name:</code>.
        Comments on your own channel also accept the shorter <code className="rounded bg-hover px-1 py-0.5 text-text">:emoji_name:</code> code.
      </p>
      <p className="mt-4 text-[13px] text-text-2">
        {emojis?.length ?? 0} of {EMOJI_MAX} emojis
      </p>
      <ul className={`${card} mt-2 grid grid-cols-2 gap-px overflow-hidden bg-[var(--divider)] sm:grid-cols-3 lg:grid-cols-4`} data-emoji-list>
        {emojis?.length === 0 && <li className="col-span-full bg-surface px-4 py-8 text-center text-[14px] text-text-2">No emojis yet.</li>}
        {emojis?.map((e) => (
          <li key={e.id} className="group flex items-center gap-3 bg-surface px-4 py-3" data-emoji-row={e.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={emojiUrl(e.image_path)} alt="" className="h-8 w-8 transition-transform duration-150 group-hover:scale-150" />
            <span className="min-w-0 flex-1 truncate text-[14px] text-text">:{e.name}:</span>
            <button type="button" onClick={() => void remove(e)} disabled={busy} className="text-[12px] font-medium text-[var(--link)]">
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

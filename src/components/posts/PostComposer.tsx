"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/integrations/supabase/client";
import {
  POLL_MAX_OPTIONS,
  POLL_OPTION_MAX_LEN,
  POST_IMAGE_MAX_BYTES,
  POST_MAX_LEN,
  cleanPollOptions,
  postImageExt,
  validatePostBody,
} from "@/lib/posts/rules";

type ComposerChannel = { id: string; name: string; handle: string; avatarUrl: string | null };

export function PostComposer({
  channel,
  userId,
  onCreated,
}: {
  channel: ComposerChannel;
  userId: string;
  onCreated: () => void;
}) {
  const [body, setBody] = useState("");
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (f.size > POST_IMAGE_MAX_BYTES) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    if (!postImageExt(f.name, f.type)) {
      setError("Use a PNG, JPG, WebP, or GIF image.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    setError(null);
    const checked = validatePostBody(body);
    if (!checked.ok) return setError(checked.error);
    const poll = showPoll ? cleanPollOptions(pollOptions) : { ok: true as const, options: null };
    if (!poll.ok) return setError(poll.error);

    setBusy(true);
    try {
      let imagePath: string | null = null;
      if (file) {
        const ext = postImageExt(file.name, file.type);
        if (!ext) {
          setError("Unsupported image format.");
          return;
        }
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("posts").upload(path, file, {
          contentType: file.type || `image/${ext}`,
          upsert: false,
        });
        if (upErr) {
          setError("Couldn't upload image. Try again.");
          return;
        }
        imagePath = path;
      }

      const { error: insErr } = await supabase.from("community_posts").insert({
        channel_id: channel.id,
        author_id: userId,
        body: checked.text,
        image_path: imagePath,
        poll_options: poll.options,
      });
      if (insErr) {
        setError(insErr.message || "Couldn't publish post.");
        return;
      }
      setBody("");
      setShowPoll(false);
      setPollOptions(["", ""]);
      pickFile(null);
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-divider bg-surface p-4" data-post-composer>
      <div className="flex items-start gap-3">
        <Avatar name={channel.name} url={channel.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-text">{channel.name}</p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={POST_MAX_LEN}
            rows={3}
            placeholder="Share an update, question, or poll with your viewers..."
            data-post-body-input
            className="mt-2 w-full resize-y rounded-lg border border-divider bg-page px-3 py-2 text-[14px] text-text placeholder:text-text-3 focus:border-[var(--link)] focus:outline-none"
          />
          {preview && (
            <div className="relative mt-2 inline-block max-w-full">
              <img src={preview} alt="Post attachment preview" className="max-h-72 rounded-lg border border-divider object-contain" />
              <button
                type="button"
                onClick={() => pickFile(null)}
                aria-label="Remove image"
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-[16px] text-white hover:bg-black"
              >
                ×
              </button>
            </div>
          )}
          {showPoll && (
            <div className="mt-3 space-y-2 rounded-lg border border-divider bg-page p-3" data-post-poll-editor>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-text-2">Poll options</span>
                <button type="button" onClick={() => setShowPoll(false)} className="text-[12px] text-text-2 hover:text-text">
                  Remove poll
                </button>
              </div>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    maxLength={POLL_OPTION_MAX_LEN}
                    placeholder={`Option ${idx + 1}`}
                    data-poll-option={idx}
                    onChange={(e) => {
                      const next = [...pollOptions];
                      next[idx] = e.target.value;
                      setPollOptions(next);
                    }}
                    className="flex-1 rounded-md border border-divider bg-surface px-2.5 py-1.5 text-[13px] text-text focus:border-[var(--link)] focus:outline-none"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                      aria-label={`Remove option ${idx + 1}`}
                      className="px-2 text-[14px] text-text-2 hover:text-text"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < POLL_MAX_OPTIONS && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ""])}
                  className="text-[12px] font-medium text-[var(--link)] hover:underline"
                >
                  + Add option
                </button>
              )}
            </div>
          )}
          {error && <p className="mt-2 text-[13px] text-[var(--red)]" role="alert">{error}</p>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-full border border-divider px-3 py-1.5 text-[13px] text-text hover:bg-hover"
              >
                Image
              </button>
              <button
                type="button"
                onClick={() => setShowPoll((v) => !v)}
                data-toggle-poll
                className={`rounded-full border px-3 py-1.5 text-[13px] ${showPoll ? "border-[var(--link)] text-[var(--link)]" : "border-divider text-text hover:bg-hover"}`}
              >
                Poll
              </button>
            </div>
            <button
              type="button"
              disabled={busy || !body.trim()}
              onClick={submit}
              data-post-submit
              className="btn-blue rounded-full px-5 disabled:opacity-50"
            >
              {busy ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
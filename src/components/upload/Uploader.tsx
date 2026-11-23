"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useFlag } from "@/lib/store/session";
import { useUpload } from "@/lib/store/upload";
import { studioErrorMessage } from "@/lib/studio/rules";
import { ThumbnailEditor } from "./ThumbnailEditor";
import {
  ACCEPT,
  DESCRIPTION_MAX,
  TITLE_MAX,
  UPLOADS_PER_DAY,
  formatBytes,
  formatSpeed,
  percentDone,
  type Visibility,
} from "@/lib/upload/rules";

function UploadArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
    </svg>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
}

/** A responsive upload panel that uses the same surfaces and borders as the rest of SlopTube. */
function Card({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="mx-auto flex w-full max-w-[1080px] flex-col overflow-hidden rounded-2xl border border-divider bg-surface shadow-[0_12px_36px_rgba(0,0,0,0.16)]">
      <header className="flex min-h-[76px] shrink-0 items-center justify-between gap-4 border-b border-divider bg-[color-mix(in_srgb,var(--hover)_45%,transparent)] px-5 py-4 sm:px-7">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-3">SlopTube · Creator tools</p>
          <h1 className="mt-1 truncate text-[21px] font-semibold leading-7 text-text sm:text-[23px]">{title}</h1>
        </div>
        <span className="hidden shrink-0 items-center gap-2 rounded-full border border-divider bg-surface px-3 py-2 text-[11px] font-medium text-text-2 sm:inline-flex">
          <span className="h-2 w-2 rounded-full bg-[var(--mark)]" />
          Upload center
        </span>
      </header>
      {children}
      {footer && <footer className="border-t border-divider bg-[color-mix(in_srgb,var(--hover)_45%,transparent)] px-4 py-4 sm:px-7">{footer}</footer>}
    </section>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="mb-5 rounded-xl border border-divider bg-surface px-4 py-3 text-[14px] leading-5 text-text shadow-[0_4px_18px_rgba(0,0,0,0.08)]">
      {children}
    </div>
  );
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string; hint: string }[] = [
  { value: "private", label: "Private", hint: "Only you can watch your video" },
  { value: "unlisted", label: "Unlisted", hint: "Anyone with the video link can watch your video" },
  { value: "public", label: "Public", hint: "Everyone can watch your video" },
];

function DropZone({ disabled }: { disabled: boolean }) {
  const pick = useUpload((s) => s.pick);
  const notice = useUpload((s) => s.notice);
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  function onDrag(e: DragEvent, kind: "enter" | "leave" | "over") {
    e.preventDefault();
    if (disabled) return;
    if (kind === "enter") depth.current++;
    if (kind === "leave") depth.current = Math.max(0, depth.current - 1);
    setDragging(kind === "over" || depth.current > 0);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) pick(file);
  }

  return (
    <div
      data-upload-zone={dragging ? "dragging" : "idle"}
      onDragEnter={(e) => onDrag(e, "enter")}
      onDragOver={(e) => onDrag(e, "over")}
      onDragLeave={(e) => onDrag(e, "leave")}
      onDrop={onDrop}
      className={`m-4 flex min-h-[360px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-all duration-200 sm:m-6 sm:min-h-[420px] sm:px-8 ${
        dragging
          ? "border-[var(--mark)] bg-[color-mix(in_srgb,var(--mark)_9%,transparent)] shadow-[inset_0_0_0_1px_var(--mark)]"
          : "border-divider bg-[color-mix(in_srgb,var(--hover)_42%,transparent)] hover:border-[var(--input-border)]"
      }`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        aria-label="Select a video file"
        className={`grid h-24 w-24 place-items-center rounded-[28px] border border-divider bg-surface text-[var(--link)] shadow-[0_8px_28px_rgba(0,0,0,0.16)] transition-all duration-200 ${
          dragging ? "scale-105 border-[var(--mark)] text-[var(--mark)]" : "hover:-translate-y-1"
        }`}
      >
        <UploadArrow className={`h-11 w-11 transition-transform ${dragging ? "-translate-y-1" : ""}`} />
      </button>
      <p className="mt-6 text-[17px] font-semibold leading-7 text-text sm:text-[19px]">
        {dragging ? "Drop your video here" : "Drag and drop your video"}
      </p>
      <p className="mt-1 max-w-[420px] text-[13px] leading-5 text-text-2 sm:text-[14px]">
        Or choose a file from your device. Your video stays private until you publish it.
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        className="btn-blue mt-6 !h-11 !rounded-lg !px-7 !font-semibold !normal-case !tracking-normal"
      >
        Choose video
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        data-testid="file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) pick(file);
        }}
      />
      {notice && (
        <p role="alert" className="mt-5 text-[13px] leading-5 text-[var(--error)]">
          {notice}
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <span className="rounded-full border border-divider bg-surface px-3 py-1.5 text-[11px] font-medium text-text-2">MP4 · MOV · WebM · MKV</span>
        <span className="rounded-full border border-divider bg-surface px-3 py-1.5 text-[11px] font-medium text-text-2">Compressed to 50 MB</span>
        <span className="rounded-full border border-divider bg-surface px-3 py-1.5 text-[11px] font-medium text-text-2">Up to {UPLOADS_PER_DAY} uploads / day</span>
      </div>
    </div>
  );
}

function Counter({ value, max }: { value: number; max: number }) {
  return <span className={`text-[12px] ${value > max ? "text-[var(--error)]" : "text-text-3"}`}>{value}/{max}</span>;
}

/**
 * "Upload as a Snip" (feature 11, with the shorts flag on). Ticked by itself
 * for a vertical file of 60 seconds or less; greyed out with the reason for
 * anything else. Unticking keeps a qualifying video out of Snips.
 */
function ShortChoice() {
  const on = useFlag("shorts");
  const short = useUpload((s) => s.short);
  const setShortOn = useUpload((s) => s.setShortOn);
  if (!on) return null;
  const allowed = short.state === "ready" && short.problem === null;
  return (
    <div className="mt-6 rounded-xl border border-divider bg-[color-mix(in_srgb,var(--hover)_38%,transparent)] p-3" data-short-choice={short.state === "checking" ? "checking" : allowed ? "allowed" : "not-allowed"}>
      <label className={`flex items-start gap-3 rounded-[2px] px-1 py-2 ${allowed ? "cursor-pointer hover:bg-hover" : "cursor-not-allowed"}`}>
        <input
          type="checkbox"
          checked={allowed && short.on}
          disabled={!allowed}
          onChange={(e) => setShortOn(e.target.checked)}
          data-short-choice-box
          className="mt-[3px] h-[18px] w-[18px] accent-[var(--link)]"
        />
        <span>
          <span className={`block text-[14px] font-medium leading-5 ${allowed ? "text-text" : "text-text-3"}`}>Upload as a Snip</span>
          <span className="block text-[13px] leading-[18px] text-text-2" data-short-choice-hint>
            {short.state === "checking"
              ? "Checking the file's size and length..."
              : short.problem ?? "Vertical and 60 seconds or less, so it can show in Snips. Untick to keep it a regular video."}
          </span>
        </span>
      </label>
    </div>
  );
}

/** What happened to the custom thumbnail, in words. */
function thumbLine(state: string | undefined, error: string | null | undefined): string | null {
  if (state === "saving") return "Saving thumbnail...";
  if (state === "saved") return "Thumbnail saved.";
  if (state === "failed") return `The thumbnail didn't save: ${error ?? "try again"}.`;
  if (state === "later") return "Your video is still processing. Add the thumbnail from Studio once it's ready.";
  return null;
}

/** The "Add thumbnail" button and the picked thumbnail, with Change and Remove. */
function ThumbnailField() {
  const thumb = useUpload((s) => s.thumb);
  const setThumb = useUpload((s) => s.setThumb);
  const clearThumb = useUpload((s) => s.clearThumb);
  const [open, setOpen] = useState(false);
  const line = thumbLine(thumb?.state, thumb?.error);
  return (
    <div className="mt-7 rounded-xl border border-divider bg-[color-mix(in_srgb,var(--hover)_35%,transparent)] p-4" data-thumbnail-field>
      <h3 className="text-[16px] font-medium leading-[22px] text-text">Thumbnail</h3>
      <p className="mt-1 text-[13px] leading-[18px] text-text-2">
        Pick a picture that shows what's in your video. You can set its size and position before saving.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {thumb ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb.url} alt="Your thumbnail" className="aspect-video w-[184px] rounded-lg object-cover shadow-[0_0_0_1px_var(--divider)]" data-thumb-chosen />
            <div className="flex flex-col items-start gap-1">
              <button type="button" onClick={() => setOpen(true)} className="btn-text !px-2" disabled={thumb.state === "saving"}>
                Change
              </button>
              {thumb.state !== "saved" && thumb.state !== "saving" && (
                <button type="button" onClick={clearThumb} className="btn-text !px-2">
                  Remove
                </button>
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid aspect-video w-[184px] place-items-center rounded-lg border border-dashed border-[var(--input-border)] bg-surface text-[13px] font-medium text-text-2 transition-colors hover:border-[var(--link)] hover:bg-hover"
            data-add-thumbnail
          >
            Add thumbnail
          </button>
        )}
      </div>
      {line && (
        <p className={`mt-2 text-[12px] ${thumb?.state === "failed" ? "text-[var(--error)]" : "text-text-2"}`} data-thumb-state={thumb?.state}>
          {line}
        </p>
      )}
      {open && (
        <ThumbnailEditor
          onClose={() => setOpen(false)}
          onDone={(blob, url) => {
            setThumb(blob, url);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function DetailsForm() {
  const details = useUpload((s) => s.details);
  const setDetails = useUpload((s) => s.setDetails);
  const fileName = useUpload((s) => s.fileName);
  const phase = useUpload((s) => s.phase);
  const thumb = useUpload((s) => s.thumb);
  const titleMissing = details.title.trim() === "";

  return (
    <div className="grid gap-8 px-4 py-5 sm:px-6 sm:py-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
      <div className="min-w-0">
        <div className="mb-5">
          <h2 className="text-[18px] font-semibold leading-6 text-text">Video details</h2>
          <p className="mt-1 text-[13px] leading-5 text-text-2">Give your upload a title and tell viewers what it is about.</p>
        </div>

        <label className="mt-4 block rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 pb-3 pt-3 transition-colors focus-within:border-[var(--focus)] focus-within:shadow-[0_0_0_1px_var(--focus)]">
          <span className="flex justify-between text-[12px] leading-4 text-text-2">
            <span>Title (required)</span>
            <Counter value={details.title.length} max={TITLE_MAX} />
          </span>
          <textarea
            value={details.title}
            maxLength={TITLE_MAX}
            rows={2}
            onChange={(e) => setDetails({ title: e.target.value.replace(/\n/g, " ") })}
            placeholder="Add a title that describes your video"
            className="mt-2 block min-h-[58px] w-full resize-none bg-transparent text-[15px] leading-[23px] text-text outline-none placeholder:text-text-3"
          />
        </label>
        {titleMissing && <p className="mt-1 text-[12px] text-[var(--error)]">Your video needs a title.</p>}

        <label className="mt-5 block rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 pb-3 pt-3 transition-colors focus-within:border-[var(--focus)] focus-within:shadow-[0_0_0_1px_var(--focus)]">
          <span className="flex justify-between text-[12px] leading-4 text-text-2">
            <span>Description</span>
            <Counter value={details.description.length} max={DESCRIPTION_MAX} />
          </span>
          <textarea
            value={details.description}
            maxLength={DESCRIPTION_MAX}
            rows={5}
            onChange={(e) => setDetails({ description: e.target.value })}
            placeholder="Tell viewers about your video"
            className="mt-2 block min-h-[120px] w-full resize-y bg-transparent text-[15px] leading-[23px] text-text outline-none placeholder:text-text-3"
          />
        </label>

        <ThumbnailField />

        <fieldset className="mt-7">
          <legend className="text-[16px] font-semibold leading-[22px] text-text">Who can watch this video?</legend>
          <p className="mt-1 text-[13px] leading-[18px] text-text-2">
            Your video is saved as a draft. Nobody sees it until you press Publish, then it becomes:
          </p>
          <div className="mt-3 space-y-1">
            {VISIBILITY_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                  details.visibility === o.value
                    ? "border-[var(--link)] bg-[color-mix(in_srgb,var(--link)_8%,transparent)]"
                    : "border-divider bg-[var(--input-bg)] hover:border-[var(--input-border)] hover:bg-hover"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={o.value}
                  checked={details.visibility === o.value}
                  onChange={() => setDetails({ visibility: o.value })}
                  className="mt-[3px] h-[18px] w-[18px] accent-[var(--link)]"
                />
                <span>
                  <span className="block text-[14px] font-medium leading-5 text-text">{o.label}</span>
                  <span className="block text-[13px] leading-[18px] text-text-2">{o.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <ShortChoice />
      </div>

      <aside className="min-w-0">
        <div className="rounded-2xl border border-divider bg-[var(--input-bg)] p-3">
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-3">Video preview</p>
            <span className="rounded-full bg-[color-mix(in_srgb,var(--link)_12%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--link)]">
              {phase === "compressing" ? "Compressing" : phase === "finishing" ? "Finalizing" : "Uploading"}
            </span>
          </div>
          <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl bg-black text-[13px] text-[#c7c7c7]">
            {thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
            )}
            <span className="relative">
              {phase === "compressing" ? "Compressing video" : phase === "checking" ? "Checking video" : phase === "finishing" ? "Finishing up" : "Uploading video"}
            </span>
          </div>
          <div className="px-2 pb-1 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-3">Filename</p>
            <p className="mt-1 break-all text-[13px] leading-5 text-text">{fileName}</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-divider bg-[color-mix(in_srgb,var(--hover)_35%,transparent)] p-4">
          <p className="text-[13px] font-semibold text-text">Automatic compression</p>
          <p className="mt-1 text-[12px] leading-5 text-text-2">
            Your video is compressed in your browser before upload. You can keep editing the details while it runs.
          </p>
        </div>
      </aside>
    </div>
  );
}

function ProgressFooter() {
  const { phase, sent, total, speed, cancel, compress } = useUpload();
  const squeezing = phase === "compressing";
  const percent = squeezing
    ? Math.round(compress.fraction * 100)
    : phase === "signing" || phase === "checking"
      ? 0
      : percentDone(sent, total);
  const line = squeezing
    ? `Compressing ${percent}%`
    : phase === "checking"
      ? "Checking the video"
      : phase === "signing"
        ? "Starting upload"
        : phase === "finishing"
          ? "Upload complete, checking the file"
          : `Uploading ${percent}%`;
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 text-[13px] leading-5">
          <span className="font-medium text-text" data-testid="upload-percent">
            {line}
          </span>
          {phase === "uploading" && (
            <span className="text-text-2">
              {formatBytes(sent)} of {formatBytes(total)}, {formatSpeed(speed)}
            </span>
          )}
          {squeezing && (
            <span className="text-text-2">Making {formatBytes(compress.originalBytes)} smaller before it uploads</span>
          )}
          {!squeezing && compress.compressed && compress.finalBytes !== null && (
            <span className="text-text-2" data-compressed>
              Compressed {formatBytes(compress.originalBytes)} to {formatBytes(compress.finalBytes)} (
              {Math.max(0, Math.round((1 - compress.finalBytes / Math.max(1, compress.originalBytes)) * 100))}% smaller)
            </span>
          )}
        </div>
        {compress.note && !squeezing && <p className="mt-1 text-[12px] leading-4 text-text-3">{compress.note}</p>}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Upload progress"
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--progress-track)]"
        >
          <div className="h-full rounded-full bg-[var(--progress)] transition-[width] duration-200" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <button type="button" onClick={() => void cancel()} disabled={phase === "finishing"} className="btn-text">
        Cancel
      </button>
    </div>
  );
}

function DoneView() {
  const { watchUrl, details, reset, ready, videoId, thumb } = useUpload();
  const setThumb = useUpload((s) => s.setThumb);
  const [editing, setEditing] = useState(false);
  const thumbNote = thumbLine(thumb?.state, thumb?.error);
  const [published, setPublished] = useState<Visibility | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // Only ever rendered in the browser, after an upload: window is there.
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const label = VISIBILITY_OPTIONS.find((o) => o.value === details.visibility)?.label ?? "Public";

  async function publish() {
    if (!videoId || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch("/api/studio/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [videoId], action: "visibility", visibility: details.visibility }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok || body.error) throw new Error(body.error ?? "failed");
      setPublished(details.visibility);
    } catch (err) {
      setProblem(studioErrorMessage(err instanceof Error ? err.message : "failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-upload-phase="done" className="flex min-h-[420px] flex-col items-center justify-center px-5 py-14 text-center">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb.url} alt="Your thumbnail" className="aspect-video w-[260px] rounded-xl border border-divider object-cover shadow-[0_8px_28px_rgba(0,0,0,0.18)]" data-thumb-done />
      ) : (
        <div className="grid h-20 w-20 place-items-center rounded-[26px] border border-divider bg-[color-mix(in_srgb,var(--mark)_10%,transparent)]">
          <CheckCircle className="h-11 w-11 text-[var(--mark)]" />
        </div>
      )}
      <p className="mt-6 text-[23px] font-semibold leading-8 text-text">
        {published ? "Published!" : ready ? "Video uploaded and saved as a draft." : "Video uploaded. Processing starts soon."}
      </p>
      <p className="mt-2 max-w-[520px] text-[14px] leading-5 text-text-2" data-draft-note>
        <span className="font-medium text-text">{details.title}</span>{" "}
        {published
          ? published === "private"
            ? "is published as private: only you can watch it."
            : published === "unlisted"
              ? "is unlisted: anyone with the link can watch it."
              : "is public: everyone can find and watch it."
          : "is a draft. Only you can see it until you publish it."}
      </p>
      {problem && (
        <p role="alert" className="mt-2 text-[13px] text-[var(--error)]">
          {problem}
        </p>
      )}
      {thumbNote && (
        <p className={`mt-2 text-[13px] ${thumb?.state === "failed" ? "text-[var(--error)]" : "text-text-2"}`} data-thumb-state={thumb?.state}>
          {thumbNote}
        </p>
      )}
      {watchUrl && (
        <div className="mt-6 w-full max-w-[460px] rounded-xl border border-divider bg-[color-mix(in_srgb,var(--hover)_42%,transparent)] px-4 py-3 text-left">
          <p className="text-[12px] leading-4 text-text-2">Video link</p>
          <Link href={watchUrl} className="link mt-1 block break-all text-[14px] leading-5">
            {origin}
            {watchUrl}
          </Link>
        </div>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-text !h-10 !rounded-lg !normal-case">
          Upload another
        </button>
        {videoId && ready && (
          <button type="button" onClick={() => setEditing(true)} disabled={thumb?.state === "saving"} className="btn-text" data-add-thumbnail>
            {thumb ? "Change thumbnail" : "Add thumbnail"}
          </button>
        )}
        {published ? (
          <Link href="/studio/videos" className="btn-blue !h-10 !rounded-lg !normal-case">
            Go to your videos
          </Link>
        ) : (
          <button type="button" onClick={() => void publish()} disabled={busy || !videoId} className="btn-blue !h-10 !rounded-lg !normal-case" data-publish>
            {busy ? "Publishing..." : `Publish as ${label.toLowerCase()}`}
          </button>
        )}
      </div>
      {!published && <p className="mt-3 text-[12px] text-text-3">You can also publish it later from Studio.</p>}
      {editing && (
        <ThumbnailEditor
          onClose={() => setEditing(false)}
          onDone={(blob, url) => {
            setThumb(blob, url);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function FailedView() {
  const { error, reset } = useUpload();
  return (
    <div data-upload-phase="failed" className="flex min-h-[420px] flex-col items-center justify-center px-5 py-14 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-[26px] border border-[color-mix(in_srgb,var(--error)_24%,var(--divider))] bg-[color-mix(in_srgb,var(--error)_9%,transparent)] text-[32px] font-semibold text-[var(--error)]">!</div>
      <p className="mt-6 text-[23px] font-semibold leading-8 text-text">The upload did not finish</p>
      <p role="alert" className="mt-2 max-w-[520px] text-[14px] leading-5 text-[var(--error)]">
        {error}
      </p>
      <button type="button" onClick={reset} className="btn-blue mt-8 !h-10 !rounded-lg !normal-case">
        Try again
      </button>
    </div>
  );
}

/** The whole /upload experience: drop zone, details while uploading, then done. */
export function Uploader({ configured, preview = false }: { configured: boolean; preview?: boolean }) {
  const phase = useUpload((s) => s.phase);
  const title = useUpload((s) => s.details.title);
  const busy = phase === "compressing" || phase === "checking" || phase === "signing" || phase === "uploading" || phase === "finishing";

  // Keep a dropped file from opening in the tab, and warn before leaving mid upload.
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const warn = (e: BeforeUnloadEvent) => {
      if (busy) e.preventDefault();
    };
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
      window.removeEventListener("beforeunload", warn);
    };
  }, [busy]);

  return (
    <div data-upload-state={preview ? "preview" : "ready"} data-upload-phase={phase} className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-[1080px]">
        {preview && (
          <Notice>
            <p className="font-medium">database not connected</p>
            <p className="mt-1 text-text-2">
              This is a preview of the upload page. Add the publishable key to <code>.env.local</code> (see{" "}
              <code>.env.example</code>) and restart to upload for real.
            </p>
          </Notice>
        )}
        {!configured && !preview && (
          <Notice>
            <p className="font-medium">Uploads are not configured on this server yet</p>
            <p className="mt-1 text-text-2">
              The site owner needs to add the four R2 settings (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
              R2_BUCKET). See &quot;Uploads (R2)&quot; in the README.
            </p>
          </Notice>
        )}
      </div>
      <Card
        title={busy || phase === "done" ? title || "Upload videos" : "Upload videos"}
        footer={busy ? <ProgressFooter /> : undefined}
      >
        {phase === "idle" && <DropZone disabled={!configured && !preview} />}
        {busy && <DetailsForm />}
        {phase === "done" && <DoneView />}
        {phase === "failed" && <FailedView />}
      </Card>
    </div>
  );
}

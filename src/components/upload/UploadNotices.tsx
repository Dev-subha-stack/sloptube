import type { ReactNode } from "react";
import { ChannelMessage } from "../channel/ChannelNotices";

/** A full page message, same look as the channel ones. */
export function UploadMessage({ state, title, children }: { state: string; title: string; children?: ReactNode }) {
  return (
    <div data-upload-state={state}>
      <ChannelMessage state={state} title={title}>
        {children}
      </ChannelMessage>
    </div>
  );
}

export function UploadsOff({ noDb = false }: { noDb?: boolean }) {
  return (
    <UploadMessage state="off" title="Uploads aren't on yet">
      Uploading is switched off right now. Check back soon.
      {noDb && <span className="mt-2 block text-text-3">database not connected</span>}
    </UploadMessage>
  );
}

/** Loading state styled like the upload panel so the page does not flash a blank block. */
export function UploadSkeleton() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-[1080px] overflow-hidden rounded-2xl border border-divider bg-surface shadow-[0_12px_36px_rgba(0,0,0,0.12)]">
        <div className="flex min-h-[76px] items-center border-b border-divider bg-[color-mix(in_srgb,var(--hover)_45%,transparent)] px-5 py-4 sm:px-7">
          <div className="w-full space-y-2">
            <div className="h-2 w-32 rounded-full bg-skeleton" />
            <div className="h-6 w-48 max-w-full rounded-md bg-skeleton" />
          </div>
        </div>
        <div className="m-4 flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-divider bg-[color-mix(in_srgb,var(--hover)_35%,transparent)] px-6 py-10 sm:m-6 sm:min-h-[420px]">
          <div className="h-24 w-24 rounded-[28px] border border-divider bg-skeleton" />
          <div className="mt-6 h-5 w-64 max-w-full rounded-md bg-skeleton" />
          <div className="mt-2 h-4 w-80 max-w-full rounded-md bg-skeleton" />
          <div className="mt-6 h-11 w-36 rounded-lg bg-skeleton" />
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <div className="h-7 w-28 rounded-full bg-skeleton" />
            <div className="h-7 w-32 rounded-full bg-skeleton" />
            <div className="h-7 w-36 rounded-full bg-skeleton" />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { moderationErrorMessage, REASON_LABELS, REPORT_REASONS, reportProblem, DETAILS_MAX, type ReportReason } from "@/lib/moderation/rules";
import { useSubscriptions } from "@/lib/store/subscriptions";

type ReportableMessage = { id: string; body: string; created_at: string };

export function ReportMessageDialog({ message, onClose }: { message: ReportableMessage; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showToast = useSubscriptions((s) => s.showToast);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const problem = reportProblem(reason, details);
  const submit = async () => {
    if (problem || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/moderation/report-dm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId: message.id, reason, details: details.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok && json.error !== "already_reported") {
        setError(moderationErrorMessage(json.error));
        return;
      }
      onClose();
      showToast(json.error === "already_reported" ? moderationErrorMessage("already_reported") : "Thanks for reporting this message");
    } catch {
      setError(moderationErrorMessage("failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="dm-report-title" data-dm-report-dialog>
      <div className="w-full max-w-[420px] rounded-[8px] border border-divider bg-surface py-5 shadow-2xl">
        <h2 id="dm-report-title" className="px-5 text-[17px] font-semibold text-text">Report message</h2>
        <div className="mx-5 mt-3 max-h-28 overflow-y-auto rounded-[6px] bg-hover px-3 py-2">
          <p className="whitespace-pre-wrap break-words text-[13px] leading-5 text-text">{message.body}</p>
        </div>
        <p className="mt-2 px-5 text-[11px] leading-4 text-text-2">
          The message and up to 10 messages immediately before it will be shared with authorised moderators for review.
        </p>
        <fieldset className="mt-3" disabled={busy}>
          <legend className="sr-only">Reason</legend>
          {REPORT_REASONS.map((r) => (
            <label key={r} className="flex h-10 cursor-pointer items-center gap-4 px-5 text-[14px] text-text hover:bg-hover" data-dm-report-reason={r}>
              <input type="radio" name="dm-report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="h-5 w-5 accent-[var(--link)]" />
              {REASON_LABELS[r]}
            </label>
          ))}
        </fieldset>
        {reason && (
          <div className="mt-2 px-5">
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={DETAILS_MAX}
              rows={3}
              placeholder={reason === "other" ? "Tell us what's wrong" : "Add details (optional)"}
              aria-label="Report details"
              className="w-full resize-none border-b border-divider bg-transparent py-1 text-[14px] text-text outline-none placeholder:text-text-2 focus:border-text"
            />
            <p className="text-right text-[12px] text-text-2">{details.trim().length}/{DETAILS_MAX}</p>
          </div>
        )}
        {error && <p className="mt-2 px-5 text-[13px] text-[var(--error)]" role="alert">{error}</p>}
        <div className="mt-4 flex justify-end gap-2 px-4">
          <button type="button" className="btn-text" disabled={busy} onClick={onClose}>Cancel</button>
          <button type="button" className="btn-text !text-link disabled:!text-text-2 disabled:opacity-60" disabled={Boolean(problem) || busy} onClick={() => void submit()} data-dm-report-send>
            {busy ? "Sending..." : "Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

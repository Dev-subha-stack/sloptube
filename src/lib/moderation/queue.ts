// The admin queue: open reports grouped by what they point at. No imports
// beyond types, so Node loads it directly.
import type { ModTargetKind, ReportKind, ReportReason } from "./rules.ts";

export type DmSnapshotMessage = { senderName: string; body: string; createdAt: string };

/** One open report as admin_reports() answers it. */
export type QueueReport = {
  id: string;
  kind: ReportKind;
  targetKind: ModTargetKind;
  targetId: string;
  reason: ReportReason | "appeal";
  details: string;
  createdAt: string;
  reporterName: string;
  targetLabel: string | null;
  videoId: string | null;
  channel: { id: string; handle: string; name: string; suspended: boolean; strikes: number } | null;
  ownerBanned: boolean;
  ownerAdmin: boolean;
  removed: boolean;
  gone: boolean;
  reportedMessage?: DmSnapshotMessage | null;
  messageContext?: DmSnapshotMessage[];
};

/** One row of the queue: every open report on one target (appeals apart). */
export type QueueGroup = {
  key: string;
  kind: ReportKind;
  targetKind: ModTargetKind;
  targetId: string;
  count: number;
  /** How many reports gave each reason, most first. */
  reasons: { reason: ReportReason | "appeal"; count: number }[];
  latest: QueueReport;
  firstAt: string;
  targetLabel: string | null;
  videoId: string | null;
  channel: QueueReport["channel"];
  ownerBanned: boolean;
  ownerAdmin: boolean;
  removed: boolean;
  gone: boolean;
};

export const groupKey = (r: Pick<QueueReport, "kind" | "targetKind" | "targetId">) => `${r.kind}:${r.targetKind}:${r.targetId}`;

const at = (s: string) => {
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
};

/**
 * Groups the open reports by target, an appeal apart from the reports on
 * the same video. Appeals come first (someone is waiting on them), then the
 * targets with the most reports, then the most recent. Within a group the
 * latest report gives the reason and the text shown.
 */
export function groupReports(reports: readonly QueueReport[]): QueueGroup[] {
  const groups = new Map<string, { list: QueueReport[] }>();
  for (const r of reports) {
    const k = groupKey(r);
    const g = groups.get(k);
    if (g) g.list.push(r);
    else groups.set(k, { list: [r] });
  }
  const out: QueueGroup[] = [];
  for (const [key, { list }] of groups) {
    const sorted = [...list].sort((a, b) => at(b.createdAt) - at(a.createdAt) || (a.id < b.id ? 1 : -1));
    const latest = sorted[0];
    const tally = new Map<QueueReport["reason"], number>();
    for (const r of sorted) tally.set(r.reason, (tally.get(r.reason) ?? 0) + 1);
    out.push({
      key,
      kind: latest.kind,
      targetKind: latest.targetKind,
      targetId: latest.targetId,
      count: sorted.length,
      reasons: [...tally].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
      latest,
      firstAt: sorted[sorted.length - 1].createdAt,
      targetLabel: latest.targetLabel,
      videoId: latest.videoId,
      channel: latest.channel,
      ownerBanned: latest.ownerBanned,
      ownerAdmin: latest.ownerAdmin,
      removed: latest.removed,
      gone: latest.gone,
    });
  }
  return out.sort(
    (a, b) =>
      Number(b.kind === "appeal") - Number(a.kind === "appeal") ||
      b.count - a.count ||
      at(b.latest.createdAt) - at(a.latest.createdAt) ||
      a.key.localeCompare(b.key),
  );
}

/** Which actions the queue offers for a group. */
export function groupActions(g: Pick<QueueGroup, "kind" | "targetKind" | "removed" | "gone" | "ownerAdmin" | "ownerBanned" | "channel">): string[] {
  if (g.targetKind === "direct_message") return ["dismiss"];
  if (g.gone) return ["dismiss"];
  if (g.kind === "appeal") return g.removed ? ["restore", "dismiss"] : ["dismiss"];
  const out = ["dismiss"];
  if ((g.targetKind === "video" || g.targetKind === "comment") && !g.removed) out.push("remove");
  if (!g.ownerAdmin) {
    out.push("strike");
    out.push(g.channel?.suspended ? "unsuspend" : "suspend");
    out.push(g.ownerBanned ? "unban" : "ban");
  }
  return out;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function snapshotMessage(value: unknown): DmSnapshotMessage | null {
  const v = objectValue(value);
  if (!v || typeof v.body !== "string") return null;
  return {
    senderName: String(v.sender_name ?? v.senderName ?? "A participant"),
    body: v.body,
    createdAt: String(v.created_at ?? v.createdAt ?? ""),
  };
}

function unpackDmDetails(raw: string): { details: string; reportedMessage: DmSnapshotMessage | null; messageContext: DmSnapshotMessage[] } {
  try {
    const data = objectValue(JSON.parse(raw) as unknown);
    if (!data) return { details: raw, reportedMessage: null, messageContext: [] };
    const list = Array.isArray(data.context) ? data.context : Array.isArray(data.previous_messages) ? data.previous_messages : [];
    return {
      details: String(data.details ?? data.user_details ?? ""),
      reportedMessage: snapshotMessage(data.reported_message ?? data.reportedMessage ?? data.message),
      messageContext: list.map(snapshotMessage).filter((m): m is DmSnapshotMessage => m !== null),
    };
  } catch {
    return { details: raw, reportedMessage: null, messageContext: [] };
  }
}

/** The admin_reports row reader. */
export function rowToReport(r: Record<string, unknown>): QueueReport {
  const kind = r.kind === "appeal" ? "appeal" : "report";
  const tk: ModTargetKind = r.target_kind === "direct_message"
    ? "direct_message"
    : r.target_kind === "comment" || r.target_kind === "channel" ? r.target_kind : "video";
  const rawDetails = String(r.details ?? "");
  const dm = tk === "direct_message" ? unpackDmDetails(rawDetails) : null;
  return {
    id: String(r.id),
    kind,
    targetKind: tk,
    targetId: String(r.target_id),
    reason: String(r.reason ?? "other") as QueueReport["reason"],
    details: dm?.details ?? rawDetails,
    createdAt: String(r.created_at ?? new Date(0).toISOString()),
    reporterName: String(r.reporter_name ?? "someone"),
    targetLabel: tk === "direct_message" ? "Reported direct message" : (r.target_label as string | null) ?? null,
    videoId: (r.video_id as string | null) ?? null,
    channel: r.channel_id
      ? {
          id: String(r.channel_id),
          handle: String(r.channel_handle ?? ""),
          name: String(r.channel_name ?? r.channel_handle ?? ""),
          suspended: r.channel_suspended === true,
          strikes: Number(r.channel_strikes ?? 0) || 0,
        }
      : null,
    ownerBanned: r.owner_banned === true,
    ownerAdmin: r.owner_admin === true,
    removed: tk === "direct_message" ? false : r.target_removed === true,
    gone: tk === "direct_message" ? false : r.target_gone === true,
    reportedMessage: dm?.reportedMessage ?? null,
    messageContext: dm?.messageContext ?? [],
  };
}
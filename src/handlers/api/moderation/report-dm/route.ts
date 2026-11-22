import { answer, badRequest, isUuid, readJson } from "@/lib/moderation/http";
import { isReason, reportProblem } from "@/lib/moderation/rules";
import { reportDirectMessage } from "@/lib/moderation/server";

// POST /api/moderation/report-dm { messageId, reason, details }.
// The database RPC validates conversation participation and message ownership.
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body || !isUuid(body.messageId) || !isReason(body.reason)) return badRequest();
  const details = typeof body.details === "string" ? body.details.trim() : "";
  const problem = reportProblem(body.reason, details);
  if (problem) return answer({ error: problem });
  return answer(await reportDirectMessage(body.messageId.toLowerCase(), body.reason, details));
}

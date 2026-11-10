// The encoder worker's only way into the database. The worker runs on its own
// server and sends ENCODER_SECRET; it may call the queue functions below and nothing else.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/** The worker's queue functions (006 processing, 014 studio cleanup, 018 Yapin' posts). */
const ALLOWED = new Set([
  "claim_encode_job",
  "encode_progress",
  "encode_done",
  "encode_failed",
  "claim_cleanup",
  "cleanup_done",
  "cleanup_failed",
  "claim_yapin_posts",
  "yapin_post_result",
]);

const Body = z.object({
  fn: z.string().max(64),
  args: z.record(z.string(), z.unknown()).default({}),
});

async function sameSecret(a: string, b: string) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const p = new Uint8Array(x);
  const q = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < p.length; i++) diff |= p[i] ^ q[i];
  return diff === 0;
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/public/encoder/rpc")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["ENCODER_SECRET"] ?? "";
        if (secret.length < 32) return json({ error: { message: "encoder_not_configured" } }, 503);
        const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!given || !(await sameSecret(given, secret))) return json({ error: { message: "unauthorized" } }, 401);

        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success || !ALLOWED.has(parsed.data.fn)) return json({ error: { message: "bad_request" } }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc(parsed.data.fn as never, parsed.data.args as never);
        if (error) return json({ data: null, error: { message: error.message, code: error.code } });
        return json({ data, error: null });
      },
    },
  },
});

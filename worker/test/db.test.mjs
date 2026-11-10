// The worker's database client: every queue call goes to the app's encoder endpoint.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createDb, createSupabase } from "../lib/db.mjs";

function fakeFetch(reply) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify(reply), { status: 200, headers: { "content-type": "application/json" } });
  };
  return { calls, impl };
}

test("calls /api/public/encoder/rpc with the secret and the function name", async () => {
  const f = fakeFetch({ data: [{ id: "j1" }], error: null });
  const client = createSupabase("https://tube.example.com/", "s".repeat(40), f.impl);
  const out = await client.rpc("claim_encode_job", { worker: "box-1" });
  assert.equal(f.calls[0].url, "https://tube.example.com/api/public/encoder/rpc");
  assert.equal(f.calls[0].init.headers.authorization, `Bearer ${"s".repeat(40)}`);
  assert.deepEqual(f.calls[0].body, { fn: "claim_encode_job", args: { worker: "box-1" } });
  assert.deepEqual(out, { data: [{ id: "j1" }], error: null });
});

test("passes database errors through so the queue reports them", async () => {
  const f = fakeFetch({ data: null, error: { message: "not_claimed" } });
  const db = createDb(createSupabase("https://tube.example.com", "s".repeat(40), f.impl));
  await assert.rejects(() => db.progress("j1", 50), /not_claimed/);
});

test("a refused request (wrong secret) is an error, not an empty queue", async () => {
  const impl = async () => new Response(JSON.stringify({ error: { message: "unauthorized" } }), { status: 401 });
  const client = createSupabase("https://tube.example.com", "wrong", impl);
  const out = await client.rpc("claim_encode_job", { worker: "box-1" });
  assert.equal(out.error.message, "unauthorized");
});

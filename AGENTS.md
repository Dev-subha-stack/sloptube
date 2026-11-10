<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (sloptube port)

- Original Next.js components keep importing `next/*`; these resolve to small shims in `src/shims/` (tsconfig paths). Why: the ported UI stays unchanged.
- Original API handlers live in `src/handlers/**/route.ts`; each `src/routes/api/**` server route calls them through `callHandler`. Why: one adapter, unchanged handler logic.
- Pages load data through `createServerFn` loaders that dynamically import `src/lib/**/server.ts`; route files only `import type` from those modules. Why: server-only code stays out of the browser bundle.
- Server functions shared by several routes live in `src/functions/` (not `src/server/`, which the client import guard blocks).
- The browser session is in localStorage; `installAuthFetch` adds the bearer to same-origin `/api/*` and `/auth/yapin*` requests, and server code reads it from the request. Why: Lovable Cloud auth has no cookie session.
- `/@handle` addresses are a router rewrite onto `/c/$handle` (`src/router.tsx`). Why: TanStack has no prefix-param equivalent of the old rewrite.
- Profile pictures and banners sit in private buckets and are served by `/api/public/images/$bucket/$`. Why: the workspace blocks public buckets.
- The encoder worker (`worker/`) never holds database keys; it calls `/api/public/encoder/rpc` with `ENCODER_SECRET`, limited to the queue functions. Why: the service role key is not available outside Lovable Cloud.
- Banned accounts are refused by the database on every Data API request (`moderation_pre_request`).

# Sardar CRM

Sardar IT's team CRM that replaces Google Sheets workflows for Fiverr and Upwork. Track your pipeline, projects, milestones, invoices, clients and analytics across your whole agency — with CSV/XLSX import to bring in your existing sheets.

Built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, **Supabase** (Postgres + Auth + Storage + Realtime) and **@dnd-kit**.

## Features

- **Dashboard** — net revenue, pipeline value, pending invoices, win rate, recent activity, upcoming follow-ups
- **Deal Pipeline** — persistent drag-and-drop Kanban (Lead → Proposal → Negotiation → Active → Won/Lost) with the exact statuses from your bid sheets
- **Clients** — profiles with history, notes, attachments, deals and projects
- **Projects & Orders** — monthly order tracking with deadlines, countdowns, gross/net/fee math, bonuses, statuses from your order sheets, and interactive milestones
- **Invoices** — draft/pending/paid/overdue hub with auto invoice numbers
- **AI Proposal Generator** — tone-aware cover letters (works with your own LLM keys, otherwise a smart template)
- **Email Templates + Automations** — template library and stage-based automation rules
- **Analytics** — revenue by platform, win rate over time, seller/developer performance, true profitability (fees + hours + expenses)
- **Bid-to-Win** — won vs lost bid patterns on the pipeline page
- **Client portal** — magic-link view of milestones with sign-off (no client login)
- **Notification webhooks** — Slack / WhatsApp / custom URLs persisted in the database (not localStorage)
- **Import** — bring historical XLSX/CSV sheets (order sheets, bid trackers, Fiverr nurture lists) with auto column mapping
- **Time Tracking** — per-project timesheet with billable/non-billable hours, assignees and weekly totals
- **Calendar** — month view of every deadline, follow-up, milestone and invoice due date, with one-click **.ics export** to Google Calendar & Outlook
- **PWA** — installable app (manifest + service worker) with an offline fallback page
- **i18n** — English / বাংলা language switcher (sidebar + login)

## Quick start (demo mode)

The app runs fully in demo mode with sample data when Supabase env vars are absent.

```bash
npm install
npm run dev
```

Open http://localhost:3000 and sign in with one of the **seeded username logins**:

| Username | Role | Initial password |
| -------- | ---- | ---------------- |
| `mamunur` | CEO | `sardar2026` |
| `zunaid` | Executive | `sardar2026` |
| `rafi` | Developer | `sardar2026` |
| `sadia` | Designer | `sardar2026` |

Data is stored locally in a JSON file (`os.tmpdir()/sardar-crm-demo-db.json`, override with `DEMO_DB_PATH`). The demo can be reset from **Settings**.

## Connecting Supabase

`supabase/schema.sql` is the source of truth for a **new** project. It includes username login (`get_profile_by_username`), the `handle_new_user` trigger, client portals, notification webhooks, expenses, sequences, and API keys.

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/schema.sql`, then `supabase/seed.sql`.
3. **Existing** databases that already ran an older `schema.sql` should also run `supabase/migrations/20260903_auth_rpc_and_portal.sql` (and `20260902_add_email_to_profiles.sql` if that was never applied). Then **redeploy** the app so the new RPC is live.
4. Copy `.env.example` to `.env.local` and fill in **real** values (not the example placeholders):

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Placeholder strings such as `your-project` or `your-anon-key` are treated as **unset**. The app stays in demo mode until both vars look like a real project.

5. Optional: set `USER_LLM_API_KEY`, `USER_LLM_BASE_URL`, `USER_LLM_MODEL` to enable real AI proposals.
6. Set `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API → service_role) to enable **Settings → Team access** for creating employee logins. Username login also needs this key: the server looks up `profiles.username` via the `get_profile_by_username` RPC (granted only to `service_role`), then signs in with the profile email.
7. Set `CREDENTIALS_ENCRYPTION_KEY` (any long random string) to store project credential passwords (WP admin, cPanel, FTP, …) **encrypted at rest** with AES-256-GCM. Without it, Supabase mode refuses to save/reveal credentials (fail closed); demo mode stores them as-is.

## Authentication

Sardar CRM uses **username + password** auth — there is **no public self-registration**. Every login is provisioned by agency management:

- The **CEO** opens **Settings → Team access**, clicks **New login**, and creates a username/password for each employee (choosing their role: CEO / Executive / Developer / Designer).
- Logins can be reset (new password), deactivated, or re-rolled at any time.
- In demo mode all four seeded logins share the initial password `sardar2026` (change it from Settings).
- **Every login is its own account.** Demo mode scopes data per login like the Supabase RLS model: the CEO sees the whole company, while `zunaid`, `rafi` and `sadia` only see deals/projects/clients/invoices assigned to their persona (plus anything they create). Workspace-level resources (seller accounts, templates, automations) stay shared.
- Login attempts are rate-limited per IP+username (5 failures / 15 min) and per IP (20 / 15 min) to blunt brute-force attacks.

With Supabase connected, usernames live in `profiles.username`; authentication uses Supabase Auth under the hood, and row-level security guarantees every user sees only their own data. The private `attachments` storage bucket is created by `schema.sql`.

If login fails after connecting Supabase, confirm `schema.sql` (or the 20260903 migration) was applied, `SUPABASE_SERVICE_ROLE_KEY` is set, and you **redeployed**. RLS writes (`auth.uid() = user_id`) also require a valid session cookie — demo-mode cookies will not satisfy live RLS.

## Project structure

```
supabase/schema.sql          Full schema, RLS policies, triggers, storage bucket
supabase/seed.sql            Idempotent demo seed for the first auth user
src/lib/types.ts             Shared TypeScript types (mirrors schema)
src/lib/constants.ts         Status metadata, currencies, platforms
src/lib/data.ts              Unified data layer (Supabase + demo dispatch)
src/lib/db/                  Demo file-backed store and seeded data
src/lib/proposal.ts          AI / template proposal generator
src/app/actions.ts           Server actions (mutations)
src/app/(app)/               All app pages: dashboard, pipeline, clients, projects,
                             invoices, proposals, templates, automations, analytics, import, settings
```

## Deploying on Vercel

1. Push this repo to GitHub and import it into Vercel.
2. Add the Supabase env vars (above) to the project settings.
3. Deploy. The app is fully static-prerendered except authenticated routes.

> **Demo mode ships with the seed data included.** If you deploy *without*
> setting the Supabase env vars, the app runs in demo mode and seeds itself
> with the full demo dataset (team, clients, pipeline, 70+ projects with
> milestones/todos/credentials/team rosters, 67 invoices, analytics) on first
> load — a fully populated demo at your deploy URL. Point the env vars at a
> Supabase project and run `supabase/schema.sql` + `supabase/seed.sql` to
> switch to the multi-user database mode.
>
> **Note for serverless hosts (e.g. Vercel):** the demo store is a local JSON
> file, which is ephemeral on serverless infrastructure — data (including any
> logins you create in Settings → Team access) can reset when instances
> recycle. Use it to explore and demo; connect Supabase for durable storage.

## License

Private project.

# MVP Prototype

## Setup

1. Install dependencies with `npm install`.
2. Copy the example environment file and fill in your Supabase keys:

   ```bash
   cp .env.example .env.local
   ```

   Populate `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project's **Settings → API** page.
   Add `SUPABASE_SERVICE_ROLE_KEY` to the same file so the seed script can create auth users (keep this key private).
3. Start the development server:

   ```bash
   npm run dev
   ```

   The app runs at [http://localhost:3000](http://localhost:3000).

> **Note:** This MVP ships with limited users and content. Demo data may be reset without notice.

## MVP Seed Data

Seed users, scripts, listings, orders, and a sample conversation in one command:

```bash
npm run seed:mvp
```

The script reads credentials from `.env`/`.env.local` and provisions:

- **Writer** `writer@ducktylo.test` / `password` with two scripts
  - `Göbeklitepe Günlükleri` — available for purchase
  - `Sahildeki Düşler` — already sold once to surface dashboard stats
- **Producer** `producer@ducktylo.test` / `password` with two listings
  - `Festival İçin Duygusal Uzun Metraj Aranıyor` — includes an accepted application, an order, and an open conversation
  - `Belgesel Ortak Yapım İlanı` — no applications so you can test the apply flow yourself

## Demo Flow (Browse → Buy → Dashboard → Apply → Messages)

Use the seeded accounts above to walk through the core experience:

1. **Browse & Buy** (producer)
   - Sign in as `producer@ducktylo.test`.
   - Open **Dashboard → Yapımcı → Browse** and review the scripts.
   - `Göbeklitepe Günlükleri` is unsold—open it and click **Satın Al** to create a fresh order.
   - `Sahildeki Düşler` already shows **Satın Alındı** so you can see the purchased state.
2. **Producer dashboards**
   - Check **Dashboard → Yapımcı** and **Dashboard → Yapımcı → Satın Almalar** to confirm the newly created order plus the pre-seeded sale.
3. **Writer dashboards**
   - Sign in as `writer@ducktylo.test` (a second browser tab works best).
   - Visit **Dashboard → Senarist** to see total sales/revenue populated by the seeded order.
   - Inspect **Dashboard → Senarist → Senaryolarım** to confirm both scripts exist.
4. **Apply to an open listing** (writer)
   - Navigate to **Dashboard → Senarist → İlanlar** and open `Belgesel Ortak Yapım İlanı`.
   - Select `Göbeklitepe Günlükleri` and submit the application; it should appear as **pending** for the writer and as a new notification for the producer.
5. **Messages**
   - The accepted application on `Sahildeki Düşler` already has a conversation with demo messages.
   - As the writer, open **Dashboard → Senarist → Mesajlar** to read or send a follow-up.
   - Switch to the producer and open **Dashboard → Yapımcı → Mesajlar** to see the same thread from the other side.

## Flow

1. Writer adds a scenario.
2. Producer posts a job listing.
3. Producer purchases a scenario from **Browse**.
4. Writer applies to the job.
5. Both parties continue the conversation in **Messages**.

## Smoke Test

After starting the dev server, run through this quick check:

1. Sign up as a **Writer** and add a scenario.
2. In a separate session, sign up as a **Producer** and create a job listing.
3. As the producer, visit **Browse** and purchase the writer's scenario.
4. Switch back to the writer and apply for the posted job.
5. Confirm a new thread appears under **Messages** for both accounts.

## End-to-End Tests

The project includes a deterministic Playwright harness that validates the writer → producer pipeline without requiring a live Supabase backend.

1. Copy the example test environment file and adjust if needed:

   ```bash
   cp .env.e2e.example .env.e2e
   ```

2. Install the Playwright browsers once:

   ```bash
   npx playwright install
   ```

3. Run the scripted scenario:

   ```bash
   npm run test:e2e
   ```

The harness is served at `/test/pipeline` while `NEXT_PUBLIC_E2E_TEST_MODE=true` and guides the full flow: the writer creates a script, the producer posts a listing, the writer applies, and the producer accepts the application.

## Definition of Done

- Yeni e2e testi yeşil.

## Supabase dump utility

Use `tools/dump-supabase.ts` to export the Supabase project's public data and metadata. The script prefers the service role key so it can inspect `information_schema` and `pg_catalog`, and falls back to the anon key when the service key isn't available.

```bash
# Environment variables can also be placed in .env.local
export NEXT_PUBLIC_SUPABASE_URL="https://<your-project>.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" # optional but recommended

npx tsx tools/dump-supabase.ts
```

The dump is written to `exports/db`. Each table becomes `<table>.json`, while `_policies.json` and `_constraints.json` hold RLS, constraint, and index metadata. Tables that cannot be read because of row-level security or missing privileges are skipped with a console warning.


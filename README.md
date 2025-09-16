# MVP Prototype

## Setup

1. Install dependencies with `npm install`.
2. Copy the example environment file and fill in your Supabase keys:

   ```bash
   cp .env.example .env.local
   ```

   Populate `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project's **Settings → API** page.
3. Start the development server:

   ```bash
   npm run dev
   ```

   The app runs at [http://localhost:3000](http://localhost:3000).

> **Note:** This MVP ships with limited users and content. Demo data may be reset without notice.

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


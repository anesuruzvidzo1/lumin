# Lumin

**Ask your data anything. Finally, it speaks your language.**

Lumin is an AI-powered data analysis platform. Upload a CSV, JSON, or text file, start a conversation, and get plain-English answers — no SQL, no code, no dashboards to configure. Lumin reads your data and talks back like a smart analyst who already understands it.

---

## What problem it solves

Most people who need answers from data don't have the skills to query a database or build a chart. They're stuck waiting on analysts, wrestling with spreadsheets, or making decisions without the full picture.

Lumin removes that bottleneck. You upload a file, describe what you want to know, and get a clear answer — sometimes with a chart automatically generated. Key findings can be pinned for later, anomalies are flagged automatically, and a weekly email digest surfaces insights you might have missed.

---

## Features

| Feature | Description |
|---|---|
| **AI conversations** | Ask questions in plain English; Claude answers based on your actual data |
| **Automatic charts** | When a chart explains the answer better, one is generated and rendered inline |
| **Suggested questions** | When a file is uploaded, 5 relevant questions are generated based on the schema |
| **Insight pinning** | Pin any AI response to a project's Insights panel so key findings are never lost |
| **Anomaly alerts** | On upload, numeric columns are scanned for outliers, spikes, constant values, and missing data |
| **PDF export** | Export any conversation as a formatted PDF report including pinned insights |
| **Weekly digest** | Every Monday, project owners receive a plain-English email summary of their data insights |
| **Multi-format support** | CSV, JSON, and plain text files up to 50 MB |

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | File-based routing, server components, API routes |
| Language | TypeScript (strict) | Catches bugs at compile time; types act as documentation |
| Runtime | Bun | Fast installs, fast test runner, single toolchain |
| AI | Anthropic Claude API | Powers Q&A, question generation, and digest summaries |
| Database | PostgreSQL via Supabase | Managed Postgres with auth and storage included |
| ORM | Drizzle | Type-safe queries; schema is the source of truth |
| Auth | Supabase Auth | Email/password, session management, server-side helpers |
| File storage | Supabase Storage | Uploaded files stored in a private bucket |
| Charts | Vega-Lite + vega-embed | Claude emits chart specs; vega-embed renders them |
| Email | Resend | Transactional email for weekly digests |
| UI components | shadcn/ui + Radix UI | Accessible, unstyled primitives with full source access |
| Styling | Tailwind CSS v4 | Utility-first; dark-mode-first design |
| Linting | Biome | Lint and format in a single fast tool |
| Testing | Bun test + Testing Library | ~10x faster than Jest; co-located tests |

---

## Project structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login and register pages
│   ├── (dashboard)/              # Protected dashboard pages
│   │   └── dashboard/
│   │       └── projects/[id]/
│   │           └── conversations/[conversationId]/
│   └── api/                      # REST API routes
│       ├── projects/[id]/
│       │   ├── conversations/
│       │   ├── data-sources/
│       │   ├── pinned-insights/
│       │   ├── anomaly-alerts/
│       │   └── suggested-questions/
│       └── cron/
│           └── weekly-digest/
├── core/                         # Infrastructure (not feature-specific)
│   ├── ai/                       # Anthropic client and constants
│   ├── config/                   # Environment variable validation
│   ├── database/                 # Drizzle client and schema
│   ├── logging/                  # Pino structured logger
│   └── supabase/                 # Server and browser Supabase clients
├── features/                     # Vertical slices — one folder per domain
│   ├── auth/
│   ├── conversations/
│   ├── data-sources/
│   ├── ingestion/
│   ├── projects/
│   ├── suggested-questions/
│   ├── pinned-insights/
│   ├── anomaly-detection/
│   └── email-digest/
├── shared/                       # Cross-feature utilities and components
│   └── components/               # ChatInterface, ExportPdfButton, dialogs
└── components/
    └── ui/                       # shadcn/ui primitives
```

Each feature slice follows the same internal structure:

```
src/features/{feature}/
├── models.ts       # Drizzle types inferred from schema
├── schemas.ts      # Zod validation schemas
├── repository.ts   # Database queries (no business logic)
├── service.ts      # Business logic, access control, logging
├── errors.ts       # Typed error classes with HTTP status codes
├── index.ts        # Public API — only this file is imported externally
└── tests/          # Unit tests for this slice
```

---

## Running locally

### Prerequisites

- [Bun](https://bun.sh) v1.0 or later
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic](https://console.anthropic.com) API key

### 1. Clone and install

```bash
git clone https://github.com/your-username/lumin.git
cd lumin
bun install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root:

```bash
# Supabase — find these in your project's API settings
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database — use the Transaction Pooler URL (port 6543) from Supabase
DATABASE_URL=postgresql://postgres.your-ref:password@aws-0-region.pooler.supabase.com:6543/postgres

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Optional: email digest (requires a Resend account)
RESEND_API_KEY=re_...
DIGEST_FROM_EMAIL=digest@yourdomain.com
APP_URL=http://localhost:3000

# Optional: secure the weekly digest cron endpoint
CRON_SECRET=a-random-secret-string
```

### 3. Set up Supabase

**Create the storage bucket** — in the Supabase dashboard, go to Storage and create a private bucket named `data-sources`.

**Set up the user sync trigger** — run this SQL in the Supabase SQL Editor so new auth users are automatically added to the `public.users` table:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4. Run the database migration

```bash
bun run db:push
```

### 5. Start the development server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000), register an account, and create your first project.

---

## Available commands

```bash
bun run dev          # Start development server (http://localhost:3000)
bun run build        # Production build with type checking
bun run lint         # Check for lint and formatting errors
bun run lint:fix     # Auto-fix lint and formatting issues
bun test             # Run test suite with coverage
bun test --watch     # Watch mode for TDD
bun run db:generate  # Generate migrations from schema changes
bun run db:migrate   # Run pending migrations
bun run db:push      # Push schema directly (dev only)
bun run db:studio    # Open Drizzle Studio database GUI
```

---

## Deploying

Lumin is designed to deploy on [Vercel](https://vercel.com). Push to a connected repository and set the environment variables in the Vercel project settings.

**Weekly digest cron** — add a `vercel.json` at the project root to schedule the digest:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-digest",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

Set `CRON_SECRET` in your Vercel environment and pass it as a `Authorization: Bearer <secret>` header from your cron job provider if using an external scheduler.

---

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for server-side storage operations |
| `DATABASE_URL` | Yes | PostgreSQL connection string (transaction pooler, port 6543) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `RESEND_API_KEY` | No | Resend API key for weekly email digests |
| `DIGEST_FROM_EMAIL` | No | Sender address for digest emails (default: `digest@lumin.app`) |
| `APP_URL` | No | Public app URL used in email links (default: `http://localhost:3000`) |
| `CRON_SECRET` | No | Bearer token to secure the `/api/cron/weekly-digest` endpoint |

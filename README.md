# StoryTurn

Know whose night it is for bedtime reading. StoryTurn helps parents (and grandparents or other caregivers) rotate reading nights, keep a shared family book library, log what you read, and send calendar invites for each session.

## Features (v1)

- Email/password-style auth UI with Google + password-reset hooks for Supabase Auth
- Create a family or join with an invite code (parents, grandparents, other readers)
- Add kids; shared family book library via Open Library search
- Alternating reader schedule for nights with both kids together
- Home page shows **your** next upcoming reading session
- Edit future sessions, cancel sessions, correct past sessions with audit trail
- ICS calendar invites via Plunk
- Dashboard: books read recently / all-time, filter by reader or whole family
- QStash-ready cron endpoint to generate upcoming sessions
- Vitest unit suite + GitHub Actions CI (`lint`, `test`, `build`)

Product plan: [`docs/features/bedtime-readers-feature-plan.md`](docs/features/bedtime-readers-feature-plan.md)

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth) when configured
- Plunk (email + ICS)
- Upstash QStash (cron)
- Open Library (book search)
- Vitest + GitHub Actions
- Vercel hosting

## Demo mode

If Supabase env vars are missing (default), the app runs against an in-memory demo family:

| Email | Role |
|-------|------|
| `alex@example.com` | Parent / owner |
| `jordan@example.com` | Parent / reader |
| `nana@example.com` | Grandparent / reader |

Invite code in the seed data: `RIVERA24`

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev -- --port 3456
```

Open [http://localhost:3456](http://localhost:3456).

```bash
npm test
npm run lint
npm run build
```

## Environment

See [`.env.example`](.env.example).

1. Create a Supabase project; enable Email + Google providers; apply [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql).
2. Add a Plunk API key for real ICS emails.
3. Configure QStash to `POST /api/cron/generate-sessions` daily (or call with `x-cron-secret: $CRON_SECRET` locally).
4. Deploy on Vercel and set the same env vars.

## CI / merge requirements

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs lint, unit tests, and production build on every pull request and on `main`.

After you create the GitHub repo, enable branch protection on `main` and **require the `lint-test-build` check to pass** before merge.

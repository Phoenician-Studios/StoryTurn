# Agent lessons

## Lessons

### 2026-10-04 — Preserve cancellation intent

- **Source:** PR #3 · Greptile
- **Gap:** Individual cancellations and schedule cancellations shared one status, so edits could retain the wrong cancellations or reopen nights intentionally skipped by a parent.
- **Going forward:** Persist cancellation provenance and test forward/backward schedule edits plus delete/restore cycles with individual cancellations.
- **Pointers:** `supabase/migrations/004_schedule_cancellation_intent.sql`, `tests/database-management.test.ts`, `tests/schedule-feedback.test.ts`

### 2026-10-04 — Notify removed calendar attendees

- **Source:** PR #3 · Greptile
- **Gap:** Reassignment discarded the previous current readers before notifications were built, leaving their original calendar invitations active.
- **Going forward:** Capture previous attendees and event time inside the mutation, send cancellations to removed readers, then send requests to current readers. Test recipients as well as persisted assignments.
- **Pointers:** `manage_schedule`, `src/lib/supabase/repository.ts`, `tests/supabase-repository.test.ts`

### 2026-10-04 — Use the schedule calendar day throughout the workflow

- **Source:** PR #3 and PR #6 · Greptile
- **Gap:** Home labels used a local calendar date while generation and demo schedule edits used UTC, skipping or failing to update tonight after UTC midnight.
- **Going forward:** Derive generation bounds and future-night filters in each schedule's timezone. Test generation, edits, and deletion across UTC/local date boundaries in both data paths.
- **Pointers:** `src/lib/domain/calendar-date.ts`, `tests/schedule-feedback.test.ts`, `tests/supabase-repository.test.ts`

### 2026-10-04 — Test the form that submits replacement lists

- **Source:** PR #4 · Greptile
- **Gap:** A store-only test resubmitted planned books manually and could not catch the session form dropping checked library books or prefilled freeform titles.
- **Going forward:** When saving replaces a collection, test the rendered form through its server action and assert retained entries after submission.
- **Pointers:** `tests/session-book-form.test.ts`, `src/app/sessions/[id]/page.tsx`, `updateSessionAction`

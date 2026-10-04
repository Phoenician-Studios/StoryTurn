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

### 2026-10-04 — Keep timezone forms usable before hydration

- **Source:** PR #5 · Greptile
- **Gap:** Browser-only timezone detection left a required server-rendered select empty, so new schedules lacked a usable default before hydration. Label formatting also repeated for every zone on each selection.
- **Going forward:** Test server-rendered form validity alongside client detection, preserve explicit saved choices, and cache supported-zone labels independently of selection state.
- **Pointers:** `src/components/timezone-picker.tsx`, `tests/timezone-picker.test.ts`, `tests/timezone-options.test.ts`

### 2026-10-04 — Paginate before the database API row limit

- **Source:** PR #6 · Greptile
- **Gap:** Slicing a capped database response made older sessions unreachable and understated the total page count.
- **Going forward:** Use an exact database count and a stable ordered range for each page, then load assignments for only that page. Test records beyond the API row cap and confirm family scoping.
- **Pointers:** `getFamilySessionPage`, `tests/supabase-repository.test.ts`, `tests/session-pages.test.ts`

### 2026-10-04 — Pending invites need lifecycle cleanup

- **Source:** PR #2 · Greptile
- **Gap:** An invite cookie survived sign-out and demo account switches, and enrolled recipients lost invite context in a redirect without explanation.
- **Going forward:** Preserve pending invites through initial authentication, clear them on sign-out, account switches, and completed family setup, and provide an explicit outcome when membership prevents accepting an invite. Test both new and enrolled recipients and account transitions.
- **Pointers:** `src/app/join/route.ts`, `src/app/actions.ts`, `tests/invite-account-lifecycle.test.ts`

### 2026-10-04 — Persist calendar revisions

- **Source:** PR #3 · Greptile
- **Gap:** A restored reader received REQUEST sequence 0 after CANCEL sequence 1 for the same calendar UID, causing clients to reject the restoration.
- **Going forward:** Persist and atomically increment each session's calendar revision across edits, cancellations, and restorations. Test remove-and-restore cycles even when the clock does not advance.
- **Pointers:** `supabase/migrations/005_calendar_sequence.sql`, `src/lib/session-mail.ts`, `tests/schedule-feedback.test.ts`

### 2026-10-04 — Verify rendered pagination

- **Source:** PR #10 · Greptile
- **Gap:** Helper tests did not verify numbered navigation, ellipses, or the current-page indicator in the rendered page.
- **Going forward:** Test the rendered navigation and its accessible labels as well as page bounds and data retrieval.
- **Pointers:** `tests/session-pages.test.ts`, `src/app/schedule/page.tsx`

### 2026-10-04 — Preserve select functionality before hydration

- **Source:** PR #9 · Greptile
- **Gap:** Replacing native selects with JavaScript menus prevented choosing parent invitations before hydration or without JavaScript.
- **Going forward:** Provide a usable server-rendered native select, upgrade after hydration, and test that a choice made during page load survives the upgrade.
- **Pointers:** `src/components/form-select.tsx`, `tests/form-select.test.ts`

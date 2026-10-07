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

### 2026-10-04 — Generate complete nights atomically

- **Source:** PR #12 · Greptile
- **Gap:** Separate inserts left a saved session without its random books after assignment failure, and retries skipped the existing night.
- **Going forward:** Create a generated session and its dependent assignments in one database transaction. Test failure rollback and retry, and lock selected books against concurrent deletion.
- **Pointers:** `supabase/migrations/007_atomic_session_generation.sql`, `generate_schedule_night`, `tests/database-management.test.ts`

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

### 2026-10-04 — Cover automatic search states

- **Source:** PR #11 · Greptile
- **Gap:** Debounced search lacked a minimum term length and tests for visible loading and failure states.
- **Going forward:** Guard short automatic searches and test loading, success, failure, and stale responses together.
- **Pointers:** `src/components/book-search.tsx`, `tests/book-search.test.ts`

### 2026-10-04 — Include foreign-key locks in concurrency review

- **Source:** PR #12 · Greptile
- **Gap:** Night generation locked a schedule before its family foreign-key check, while editing held an incompatible family lock before updating the schedule.
- **Going forward:** Account for implicit foreign-key KEY SHARE locks alongside explicit row locks. Use NO KEY UPDATE when serializing edits that do not change parent keys, and verify overlapping transactions.
- **Pointers:** `supabase/migrations/009_schedule_generation_lock.sql`, `manage_schedule`, `generate_schedule_night`

### 2026-10-04 — Preserve mobile navigation before hydration

- **Source:** PR #13 · Greptile
- **Gap:** A collapsed, inert mobile menu made every navigation route depend on JavaScript. Resizing also retained expanded mobile state.
- **Going forward:** Keep navigation links accessible in server HTML and test hydration fallback and breakpoint changes alongside toggle behavior.
- **Pointers:** `src/components/app-nav.tsx`, `tests/app-nav.test.ts`

### 2026-10-04 — Limit initial data for paginated pickers

- **Source:** PR #13 · Greptile
- **Gap:** The paginated book modal still fetched the full family library to render the session edit page.
- **Going forward:** Query only selected records for the initial view while preserving the broader lookup needed by mutation audit history. Test both paths.
- **Pointers:** `getSessionDetail`, `tests/supabase-repository.test.ts`

### 2026-10-04 — Preserve parallel queries in alternate read paths

- **Source:** PR #13 · Greptile
- **Gap:** Limiting the edit page's initial library fetch inadvertently serialized the full-library query used by saves and cancellations.
- **Going forward:** Keep independent queries in the same Promise.all when adding a dependent optimized path. Test concurrency with a blocked dependency.
- **Pointers:** `getSessionDetail`, `tests/supabase-repository.test.ts`

### 2026-10-05 — Cover alternate reactivation paths

- **Source:** PR #15 · Greptile
- **Gap:** The status selector reopened canceled sessions without confirmation, and reusing the edit mutation could duplicate non-original reader assignments.
- **Going forward:** Test every UI path that changes session status and preserve assignment rows when the requested readers match current readers.
- **Pointers:** `ConfirmationForm`, `applyReassignment`, `persistAssignments`, `tests/session-book-form.test.ts`

### 2026-10-07 — Scope ephemeral state to its owning session

- **Source:** PR #18 · Greptile
- **Gap:** Starting another tab's scan invalidated the first tab's server session, while a failed finish discarded queued ISBNs without a retry path.
- **Going forward:** Keep independent tabs' session tokens independent. Preserve recoverable queue entries until a terminal transition succeeds, and test failed transitions as well as successful cleanup in demo and live paths.
- **Pointers:** `start_book_scan`, `BookScanner.finish`, `tests/book-editions-database.test.ts`, `tests/book-scanner.test.ts`

### 2026-10-07 — Keep mutation outcomes tenant-scoped

- **Source:** PR #18 · Greptile
- **Gap:** The security-definer removal RPC distinguished a foreign book UUID from an absent UUID using an unscoped existence check.
- **Going forward:** Authorize and scope lookups before building outcomes. Foreign and absent identifiers must be indistinguishable; test both responses while asserting foreign records remain untouched.
- **Pointers:** `remove_library_books`, `removeLibraryBooks`, `tests/book-editions-database.test.ts`, `tests/book-editions-demo.test.ts`

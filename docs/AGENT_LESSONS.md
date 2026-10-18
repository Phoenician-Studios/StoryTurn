# Agent lessons

Durable lessons from PR review and production misses. `/start` loads `AGENT_CONTEXT.md`, not this file — promote recurring or high-severity themes there.

## Lessons

### 2026-10-18 — Relative session days must use family timezone

- **Source:** PR #4 · Bugbot
- **Gap:** `formatRelativeDay` defaulted “today” via UTC `formatDateOnly(new Date())` while session nights store family-local calendar days, so after UTC midnight a still-tonight session could label as “Yesterday”.
- **Going forward:** Compare and label session days with the family’s schedule IANA timezone (`formatDateOnlyInTimeZone` / `getFamilyTimezone`). Never use UTC date-only as “today” for bedtime UI.
- **Pointers:** `src/lib/domain/dates.ts`, schedule `timezone` field
- **Promoted:** AGENT_CONTEXT.md → Timezones for session calendar days

### 2026-10-18 — Upcoming book actions must use family timezone

- **Source:** PR #5 · Bugbot
- **Gap:** `upcomingScheduledSessions` used UTC “today”, so schedule UI (family TZ) and add/shuffle-upcoming CTAs could disagree near day boundaries.
- **Going forward:** Any “upcoming nights” helper must use the same family-timezone today as the schedule page.
- **Pointers:** `src/lib/demo/store.ts` `upcomingScheduledSessions`
- **Promoted:** AGENT_CONTEXT.md → Timezones for session calendar days

### 2026-10-18 — Shuffle must not rewrite completed history

- **Source:** PR #5 · Bugbot
- **Gap:** `shuffleSessionBooks` allowed replacing books on completed/past nights without a correction record, silently changing logged history and dashboard stats.
- **Going forward:** Book-shuffle / convenience mutators only target future `scheduled` nights; past edits go through `updateSession` + correction reason.
- **Pointers:** `shuffleSessionBooks`, session detail shuffle CTA
- **Promoted:** AGENT_CONTEXT.md → Corrections vs silent edits

# Agent lessons

Durable lessons from PR review and production misses. `/start` loads `AGENT_CONTEXT.md`, not this file — promote recurring or high-severity themes there.

## Lessons

### 2026-10-18 — Relative session days must use family timezone

- **Source:** PR #4 · Bugbot
- **Gap:** `formatRelativeDay` defaulted “today” via UTC `formatDateOnly(new Date())` while session nights store family-local calendar days, so after UTC midnight a still-tonight session could label as “Yesterday”.
- **Going forward:** Compare and label session days with the family’s schedule IANA timezone (`formatDateOnlyInTimeZone` / `getFamilyTimezone`). Never use UTC date-only as “today” for bedtime UI.
- **Pointers:** `src/lib/domain/dates.ts`, schedule `timezone` field

# Agent context

Project rules for StoryTurn / bedtime-readers agents. Prefer this file over chat-only conventions.

## Local development

- Demo store is the default until Supabase credentials exist.
- Do not commit secrets.

## Timezones for session calendar days

Session `scheduledFor` values are **family-local wall times** (date + bedtime), not UTC instants.

- When labeling or filtering “today / upcoming / past” nights, use the active schedule’s IANA `timezone` via `formatDateOnlyInTimeZone` / `getFamilyTimezone`.
- Do **not** use UTC `formatDateOnly(new Date())` or `toISOString().slice(0, 10)` as “today” for bedtime UI or upcoming-session actions.

## Corrections vs silent edits

- Changing past or completed session assignments/books requires the correction audit path (`updateSession` with a reason).
- Convenience actions (e.g. shuffle books) must only target **future scheduled** nights.

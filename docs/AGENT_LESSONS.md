# Agent lessons

## Lessons

### 2026-10-04 — Pending invites need lifecycle cleanup

- **Source:** PR #2 · Greptile
- **Gap:** An invite cookie survived sign-out and demo account switches, and enrolled recipients lost invite context in a redirect without explanation.
- **Going forward:** Preserve pending invites through initial authentication, clear them on sign-out, account switches, and completed family setup, and provide an explicit outcome when membership prevents accepting an invite. Test both new and enrolled recipients and account transitions.
- **Pointers:** `src/app/join/route.ts`, `src/app/actions.ts`, `tests/invite-account-lifecycle.test.ts`

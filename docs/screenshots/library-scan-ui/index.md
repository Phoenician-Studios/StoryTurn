# Library and scanning UI captures

Captured by the primary agent on 2026-10-07 against HEAD `9278df8` plus this PR’s changes. Server: this worktree on localhost:3457 with FORCE_DEMO_MODE=1. All images are viewport captures from real interactions with the demo family and live Open Library responses. Orca was not running, so the ui-capture workflow used the Codex browser for capture.

- `search-desktop.jpg`: desktop navigation, compact back link, search clear icon, collapsible editions, and adjacent results aligned at the top.
- `format-dialog.jpg`: format input and Set format button inside the edit dialog.
- `scanning-mobile.jpg`: saved scans with green checks and backgrounds; thumbnail stays beside the book details and actions.
- `scanning-phone.jpg`: phone-width scan results, newest first, with long metadata wrapping inside the text column.
- `end-session.jpg`: simplified end-session warning at phone width.

Backend corroboration: the demo server returned successful saves and the books appeared in the collection after ending the scan. Automated tests verify failed-row dismissal without deleting books, scan ordering, stale search responses after clearing, edition collapse without refetching, and format submission from the dialog.

Review follow-up captures measured at HEAD `74e0597` plus the Greptile fixes, using this worktree’s demo server at 127.0.0.1:3457:

- `library-phone-reviewed.jpg`: phone library with a 44px back-link touch target and 16px label.
- `end-session-reviewed.jpg`: brief warning explicitly covers the current save, queued/failed scans, and Undo.

# Book barcode scanning

Let a reader scan a whole shelf during setup, look up each ISBN online, and add the matched books to the shared family library. This is a discussion draft, not an approved implementation scope.

## Status

| Field | Value |
|-------|-------|
| Status | planned |
| Last updated | 2026-10-06 |
| Related PR / branch | None |

## Goals (v1)

- Scan a book's ISBN barcode using a phone browser and rear camera.
- Support typed ISBN-10 or ISBN-13 when scanning is unavailable.
- Keep the camera open between books and collect a session list showing title, authors, cover, and lookup status.
- Save each successfully matched book immediately and offer Undo in its session row. No end-of-session confirmation is required.
- Let readers resolve unknown books later without blocking the next scan.
- Keep hardcover, paperback, and other distinct editions separate; display format and edition details in scan results and library entries.
- Keep title/author search available when lookup fails.
- **Out of scope for v1:** arbitrary retail UPC lookup, OCR, native apps, paid metadata providers, and tracking multiple physical copies of the same edition.

## Current state

- [Library page](../../src/app/library/page.tsx) requires a signed-in family member and renders search plus the collection.
- [Book search](../../src/components/book-search.tsx) debounces title/author queries and marks matching Open Library keys as already collected.
- [Open Library adapter](../../src/lib/open-library.ts) returns work-level search results and takes the first ISBN in a result, which must not replace the scanned edition's ISBN.
- [Actions](../../src/app/actions.ts) call lookup and library insertion; [live repository](../../src/lib/supabase/repository.ts) checks family membership on insertion. Lookup currently has no explicit membership check.
- [Book type](../../src/lib/types.ts) already supports nullable ISBN, cover URL, and Open Library key. [Initial migration](../../supabase/migrations/001_init.sql) has no book identity uniqueness constraint. [Demo insertion](../../src/lib/demo/store.ts) also permits duplicates.

## Viability and sources

- Book ISBNs can be represented as barcodes; ISBN-13 prefixes are 978 or 979. A general UPC is not interchangeable with ISBN. Validate ISBN structure and checksum, reject unsupported codes, and ignore supplementary price codes. Sources: [ISBN bar coding](https://www.isbn-international.org/node/28), [ISBN structure](https://www.isbn-international.org/index.php/content/what-isbn/10).
- Open Library supports `/isbn/{isbn}.json` to resolve an edition. Its older `/api/books` endpoint is marked legacy. Source: [Books and ISBN APIs](https://openlibrary.org/dev/docs/api/books).
- Open Library requests should be cached and identify the application with a real contact address. Current documented limits are 1 request/second unidentified and 3 identified. Human book lookup is a supported use case; high-traffic commercial backend use is not. Source: [API usage guidance](https://openlibrary.org/developers/api).
- Native `BarcodeDetector` has limited browser support. Evaluate a client decoder such as ZXing instead of depending solely on native detection. Camera access requires permission and a secure context. Sources: [BarcodeDetector](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector), [camera API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [ZXing browser project](https://github.com/zxing-js/browser).
- No scan prototype or representative metadata coverage test has been performed. Coverage and camera speed remain empirical questions.
- Marketplace discovery was attempted for the searching category but failed due to network/cache restrictions. No service was provisioned. The proposed lookup extends the existing Open Library integration.

## Design

| Area | Proposed behavior |
|------|-------------------|
| Entry | Add “Scan your shelf” alongside current search |
| Camera | Start only after explicit tap; prefer rear camera; decode locally; do not upload frames |
| Validation | Normalize ISBN formatting, verify checksum, convert valid ISBN-10 to ISBN-13, retain scanned ISBN |
| Lookup | Authenticated server lookup of exact ISBN edition; resolve authors and parent work where available; timeout, cache, and controlled retries |
| Session | Acknowledge each captured ISBN immediately; maintain a list of pending, matched, already collected, and unresolved books |
| Save | Automatically save each successfully matched book as its lookup completes; show Added only after the server confirms insertion |
| Undo | Offer Undo on each newly added session row; delete only the exact insertion created by that scan, subject to family authorization and reference checks |
| Queue | Bounded, paced lookup queue with backpressure; capture once per normalized ISBN, avoid parallel request bursts, allow retry of failed items |
| Finish | Show added, undone, duplicate, unresolved, and failed counts; retry individual failed saves; pending lookups/saves remain visible and closing with pending entries needs explicit handling |
| Identity | Use normalized ISBN and Open Library edition identity for duplicate detection within a family; a shared work key alone does not make two books duplicates |
| Duplicate | Repeated scans of the same edition count as already collected; hardcover and paperback editions remain separate |
| Edition display | Show format prominently with title/author, plus available publisher, publication year, and ISBN; use “Format unknown” when metadata is absent |
| Search | Make title/author results edition-selectable so readers can knowingly add a specific format; compare collection membership by edition rather than work |
| Failure | Separate unsupported barcode, no match, upstream failure, and camera denial; offer typed ISBN or existing search |
| Cleanup | Keep camera active between captures; stop tracks and decoder on finish, close, unmount, or backgrounding; ignore repeated frames of the same barcode and stale lookup results |

Save must return the inserted book ID and whether it was newly created or already present. Concurrent duplicate detection must never return an existing book as an undoable insertion. Undo is idempotent and family-scoped; if the book has since been referenced by a reading log or session, retain it and explain why it cannot be removed. After undo, suppress repeated camera detections of that ISBN for the rest of the session unless the reader explicitly chooses to add it again.

Preserve work keys as grouping metadata, not uniqueness keys. Store an edition identifier, normalized ISBN, physical format, publisher, and edition publication year separately from work-level metadata. Different ISBNs can sometimes identify the same edition, so match an exact normalized ISBN first and a reliable edition ID second; never merge merely on title/author or work ID. A format label alone is not edition identity. Do not infer binding from cover art.

Existing title search currently returns work-level results and arbitrary first ISBNs. Update that flow to choose a concrete edition, keeping the edition distinction consistent across both search and scan. Existing stored records may have ambiguous identity; preserve reading references and avoid silently assigning formats or merging records. Add nullable edition fields and a deliberate backfill strategy. Design family-scoped uniqueness after inspecting existing data; leave unresolved legacy identity explicit. Review other book selection and history surfaces for clear disambiguation when titles repeat.

## Critical decisions

- User confirmed distinct editions remain separate, including hardcover versus paperback, and the UI must make this clear. Same-edition physical-copy inventory is outside the proposed v1.
- Missing format metadata must be explicit. Consider a user-editable format label; whether that belongs in v1 remains open.
- User confirmed whole-shelf scanning during setup as the primary workflow.
- User confirmed immediate saving of matched books with an undo option. Proposed Undo stays available on each newly added row for the current scan session; duration beyond the session remains open.
- Decide whether a scan session must survive reload/navigation; do not assume browser-only state provides recovery.
- Shelf setup is user-driven lookup, but larger sessions require paced requests and provider-policy review before launch.
- Test a representative sample of children's books before choosing any additional provider. Do not promise universal coverage or an unmeasured hit rate.
- Read bundled Next.js guides before coding. Keep demo/live behavior aligned, enforce family authorization server-side, and return safe lookup errors.

## Todos

1. Confirm undo availability beyond the scan session, session recovery needs, and whether users can correct missing format metadata.
2. Run a small spike on real iPhone Safari and Android Chrome and sample physical books; measure decode success, lookup accuracy, latency, and missing records separately.
3. Add ISBN normalization and exact lookup adapter; retain edition identity, format, edition metadata, work grouping, and scanned ISBN. Plan nullable schema additions and legacy identity handling.
4. Add continuous camera UI, bounded lookup/save queue, immediate-save feedback, per-row Undo, and typed ISBN fallback with cleanup and accessible feedback.
5. Add family-scoped, race-safe duplicate handling and idempotent Undo with reference checks; return exact insertion identity from save.
6. Update title search to select editions and show edition labels in library and book-selection/history surfaces where duplicate titles need disambiguation.
7. Verify lookup, save, failure, edition identity, and lifecycle paths with targeted tests and physical-device checks.

## Files to touch

| Path | Change |
|------|--------|
| [src/app/library/page.tsx](../../src/app/library/page.tsx) | Scanner entry, edition-aware collection identities, and visible format labels |
| [src/components/book-search.tsx](../../src/components/book-search.tsx) | Edition selection, format labels, and ISBN entry integration |
| `src/components/book-scanner.tsx` (new) | Camera and decoder lifecycle |
| `src/lib/isbn.ts` (new) | Normalization and validation |
| [src/lib/open-library.ts](../../src/lib/open-library.ts) | Exact edition lookup, format/publisher/year mapping, and work resolution |
| [src/app/actions.ts](../../src/app/actions.ts) | Authorized ISBN lookup, immediate save results, and Undo action |
| [src/lib/data.ts](../../src/lib/data.ts), [demo store](../../src/lib/demo/store.ts), [live repository](../../src/lib/supabase/repository.ts) | Consistent duplicate handling, insertion identity, and safe Undo |
| [src/lib/types.ts](../../src/lib/types.ts), [Supabase mapping](../../src/lib/supabase/map.ts) | Nullable edition identifier, format, publisher, and edition year |
| `supabase/migrations/` | Nullable edition metadata and family-scoped edition uniqueness after existing-data review |
| Book pickers and reading-history surfaces (locate during implementation) | Disambiguate same-title editions with format and available edition details |
| [tests/open-library.test.ts](../../tests/open-library.test.ts), [tests/book-search.test.ts](../../tests/book-search.test.ts), new scanner/ISBN tests | Exact lookup, duplicate, invalid input, and lifecycle coverage |
| [package.json](../../package.json) | Decoder dependency after spike |

## Acceptance criteria

- [ ] Supported ISBN barcode scans on agreed physical iPhone and Android devices.
- [ ] Typed ISBN works without camera permission and accepts valid ISBN-10/13.
- [ ] A reader can scan a shelf without reopening the camera for every book.
- [ ] Repeated frames of one barcode create only one session entry.
- [ ] Exact scanned ISBN is retained; matched books save immediately without a confirmation step.
- [ ] Added appears only after confirmed persistence; failed saves are retryable.
- [ ] Undo removes only the newly inserted book and never an existing duplicate or another family’s book.
- [ ] Undo preserves books referenced by reading logs or sessions and gives a useful explanation.
- [ ] Undo is safe to retry; an undone ISBN is not automatically re-added from subsequent camera frames.
- [ ] Pending lookups, duplicates, unknown books, and partial save failures have distinct session states.
- [ ] Scanning cannot create an unbounded lookup queue or burst beyond the provider request budget.
- [ ] Hardcover and paperback of the same work can both be added and are visibly distinguished.
- [ ] Repeat scans of the same edition do not create duplicates, including concurrent requests.
- [ ] Title search supports choosing a concrete edition and recognizes collection membership at edition level.
- [ ] Missing format is labeled unknown; legacy records and reading references are preserved.
- [ ] Unknown books and service failures offer a useful next step.
- [ ] Camera stops when dismissed or inactive; no images leave the device.
- [ ] Existing search and reading history continue to work in demo and live modes.
- [ ] Relevant tests, lint, and build pass.

## Handoff

### Done so far

- Inspected current library, search adapter, insert paths, schema, and official API/decoder documentation.
- Recorded whole-shelf setup, immediate save with Undo, and separate editions with visible format/edition details. Implementation not started.

### Remaining work

- Discuss open decisions with the user, then perform the viability spike before production implementation.

### Blockers / risks

- Real-device decoding and metadata coverage are unverified.
- Edition identity is agreed; legacy-record handling, missing-format correction, and scan-session recovery still need design.
- API rate limits need traffic coordination if adoption grows; process-local throttling is insufficient across instances.

### Pointers for the next agent

- Run `/feature-context` with this document when implementation is requested.
- Start with the physical-device/coverage spike, including format metadata completeness, and the legacy-edition migration design.
- Do not store arbitrary first search-result ISBNs for scanned books or depend exclusively on native BarcodeDetector.
- Run `/handoff` as work progresses or the session ends.

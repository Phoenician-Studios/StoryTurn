# Book duplicate detection

Stop the family library from collecting duplicate copies of the same book when it is added by title search and later scanned (or vice versa).

## Status

| Field | Value |
|-------|-------|
| Status | in-progress (implementation complete; awaiting PR review) |
| Owner session | cloud agent |
| Last updated | 2026-10-18 |
| Related PR / branch | `cursor/book-duplicate-detection-63e7` |

## Goals (v1)

- **Same barcode, keep the former.** Adding a book whose ISBN / UPC matches one already in the family library is a no-op; the earlier book stays and the user sees an "already in your library" toast.
- **Same title, different barcode, ask.** When title (and author, if both sides have one) match but the barcode differs, show a dialog comparing both copies and let the user keep the existing one, keep the new one, or keep both.
- **Recommend the richer copy.** The dialog marks the copy with more metadata as recommended. A cover thumbnail outweighs everything else; ties go to the existing book.
- **Out of scope for v1:** deleting books from the library, bulk dedupe of an existing library, fuzzy title matching (typos), cross-family matching.

## Design

### Matching ([`src/lib/domain/book-duplicates.ts`](../../src/lib/domain/book-duplicates.ts))

| Helper | Rule |
|--------|------|
| `bookCodeKey` | `normalizeToIsbn13`; otherwise the compact code when it looks like a barcode (non-Bookland UPC); otherwise null (provider ids such as `UOM:...` never match) |
| `normalizeTitleKey` | Drop subtitle after `:` and `(...)` / `[...]` editions, fold accents, lowercase, `&` → `and`, strip punctuation, drop a leading `the` / `a` / `an` |
| `isLikelySameBook` | Title keys equal **and** (an author matches by token subset, or either side has no authors) |
| `bookMetadataScore` | cover 8, valid barcode 4, authors 2, Open Library key 1 |

Barcode match is checked first and always wins over the title prompt.

### Store / action

- [`addBookFromSearch(input, resolution?)`](../../src/lib/demo/store.ts) returns `added` / `already_in_library` / `possible_duplicate` / `replaced`.
- New books store `isbn` as `bookCodeKey` when available, so one barcode has one stored value.
- **Replace** overwrites the existing row's metadata in place (same id, same `createdAt`). `session_books.book_id` has no `on delete cascade`, so keeping the id avoids repointing session links and avoids a delete path the app does not have yet.
- [`addBookAction`](../../src/app/actions.ts) reads `resolution` (`keep_both` | `replace`) and `existingBookId` from the form data. "Keep existing" is client-only (no write).

### UX ([`src/components/book-search.tsx`](../../src/components/book-search.tsx))

Dialog with an "In your library" card and a "Just found" card per candidate (cover, authors, ISBN, Recommended badge, "Keep this one"), plus "Keep both" in the footer.

### Data

[`supabase/migrations/004_books_unique_isbn.sql`](../../supabase/migrations/004_books_unique_isbn.sql) adds a partial unique index on `(family_id, isbn)`. Books are not written to Supabase yet (demo store only), so no existing rows can conflict. Rows written by a future Supabase path must normalize `isbn` with `bookCodeKey` first.

## Acceptance

- Unit tests in [`tests/book-duplicates.test.ts`](../../tests/book-duplicates.test.ts) and the duplicate block in [`tests/demo-store.test.ts`](../../tests/demo-store.test.ts).
- Manual: searching "Goodnight Moon" in the demo library and adding a result opens the dialog; searching `9780060775858` and adding shows the already-in-library toast.

## Handoff

- Done: matching helpers, store + action, dialog, migration, tests; manually verified in the browser.
- Next: when the Supabase data path lands, apply `bookCodeKey` before inserts and do the duplicate check in the same transaction as the insert.
- Later: library delete / merge UI for duplicates that already exist.

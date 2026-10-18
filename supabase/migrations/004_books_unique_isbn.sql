-- The app stores `books.isbn` as ISBN-13 when the code is Bookland (scanned
-- UPC / ISBN-10 are normalized first), so one barcode maps to one value.
-- Same barcode in a family keeps the earlier book; enforce that here too.
create unique index books_family_isbn_unique
  on public.books (family_id, isbn)
  where isbn is not null;

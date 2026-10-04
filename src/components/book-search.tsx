"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { addBookAction, searchBooksAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookSearchResult } from "@/lib/open-library";

function AddBookButton({ inCollection }: { inCollection: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant="secondary"
      disabled={pending || inCollection}
      aria-busy={pending}
    >
      {pending ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : inCollection ? (
        <Check aria-hidden="true" />
      ) : null}
      {pending ? "Adding…" : inCollection ? "In collection" : "Add to library"}
    </Button>
  );
}

export function BookSearch({ collectionKeys }: { collectionKeys: string[] }) {
  const [addedKeys, setAddedKeys] = useState<string[]>([]);
  const inCollection = new Set([...collectionKeys, ...addedKeys]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    const term = query.trim();
    const timer = setTimeout(async () => {
      setError(null);
      setResults([]);
      if (!term) {
        setPending(false);
        return;
      }
      setPending(true);
      try {
        const next = await searchBooksAction(term);
        if (active) setResults(next);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        if (active) setPending(false);
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResults([]);
            setError(null);
            setPending(false);
          }}
          placeholder="Search by title or author"
          aria-label="Search books"
        />
      </div>
      {pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Searching…
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ul className="space-y-3">
        {results.map((book) => (
          <li
            key={book.openLibraryKey}
            className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/70 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex gap-3">
              {book.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.coverUrl}
                  alt=""
                  className="h-16 w-12 rounded object-cover"
                />
              ) : (
                <div className="flex h-16 w-12 items-center justify-center rounded bg-secondary text-xs text-muted-foreground">
                  No cover
                </div>
              )}
              <div>
                <p className="font-medium">{book.title}</p>
                <p className="text-sm text-muted-foreground">
                  {book.authors.join(", ") || "Unknown author"}
                  {book.year ? ` · ${book.year}` : ""}
                </p>
              </div>
            </div>
            <form
              action={async (formData) => {
                try {
                  await addBookAction(formData);
                  setAddedKeys((keys) => [...keys, book.openLibraryKey]);
                  setError(null);
                } catch {
                  setError("Could not add book. Please try again.");
                }
              }}
            >
              <input type="hidden" name="title" value={book.title} />
              <input type="hidden" name="authors" value={book.authors.join(", ")} />
              <input type="hidden" name="openLibraryKey" value={book.openLibraryKey} />
              <input type="hidden" name="coverUrl" value={book.coverUrl ?? ""} />
              <input type="hidden" name="isbn" value={book.isbn ?? ""} />
              <AddBookButton inCollection={inCollection.has(book.openLibraryKey)} />
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

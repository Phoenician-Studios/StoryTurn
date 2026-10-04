"use client";

import { useState, useTransition } from "react";
import { addBookAction, searchBooksAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BookSearchResult } from "@/lib/open-library";

export function BookSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or author"
          aria-label="Search books"
        />
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                const next = await searchBooksAction(query);
                setResults(next);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Search failed");
              }
            });
          }}
        >
          {pending ? "Searching…" : "Search Open Library"}
        </Button>
      </div>
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
            <form action={addBookAction}>
              <input type="hidden" name="title" value={book.title} />
              <input
                type="hidden"
                name="authors"
                value={book.authors.join(", ")}
              />
              <input
                type="hidden"
                name="openLibraryKey"
                value={book.openLibraryKey}
              />
              <input type="hidden" name="coverUrl" value={book.coverUrl ?? ""} />
              <input type="hidden" name="isbn" value={book.isbn ?? ""} />
              <Button type="submit" size="sm" variant="secondary">
                Add to library
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

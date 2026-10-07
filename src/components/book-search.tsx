"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { searchBooksAction } from "@/app/actions";
import { BookEditions } from "@/components/book-editions";
import { Input } from "@/components/ui/input";
import type { BookSearchResult } from "@/lib/open-library";

export function BookSearch({ collectionKeys }: { collectionKeys: string[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
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
      if (term.length < 2) {
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
      <div className="relative">
        <Input
          ref={inputRef}
          className="pr-11"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResults([]);
            setError(null);
            setPending(false);
          }}
          placeholder="Search by title or author"
          aria-label="Search books"
          aria-describedby="book-search-hint"
        />
        {query && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Clear search"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => {
              setQuery("");
              setResults([]);
              setError(null);
              setPending(false);
              inputRef.current?.focus();
            }}
          >
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
      <p id="book-search-hint" className="text-sm text-muted-foreground">
        Type at least two characters to search.
      </p>
      {pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Searching…
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ul className="grid items-start gap-2 lg:grid-cols-2">
        {results.map((book) => (
          <li
            key={book.openLibraryKey}
            className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 rounded-xl border border-border/80 bg-card/70 px-3 py-2 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]"
          >
            <div className="contents">
              {book.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.coverUrl}
                  alt=""
                  className="h-14 w-10 rounded object-cover"
                />
              ) : (
                <div className="flex h-14 w-10 items-center justify-center rounded bg-secondary text-xs text-muted-foreground">
                  No cover
                </div>
              )}
              <div className="min-w-0 break-words">
                <p className="font-medium leading-snug">{book.title}</p>
                <p className="text-sm text-muted-foreground">
                  {book.authors.join(", ") || "Unknown author"}
                  {book.year ? ` · ${book.year}` : ""}
                </p>
              </div>
            </div>
            <BookEditions workKey={book.openLibraryKey} collectionKeys={collectionKeys} />
          </li>
        ))}
      </ul>
    </div>
  );
}

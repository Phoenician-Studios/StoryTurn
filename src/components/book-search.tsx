"use client";

import { useState, useTransition } from "react";
import { addBookAction, searchBooksAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type {
  BookInput,
  DuplicateKeep,
  TitleDuplicateCandidate,
} from "@/lib/domain/book-duplicates";
import type { AddBookResolution, AddBookResult } from "@/lib/demo/store";
import type { BookSearchResult } from "@/lib/open-library";

interface PendingDuplicate {
  incoming: BookInput;
  candidates: TitleDuplicateCandidate[];
}

function toBookInput(book: BookSearchResult): BookInput {
  return {
    title: book.title,
    authors: book.authors,
    openLibraryKey: book.openLibraryKey,
    coverUrl: book.coverUrl,
    isbn: book.isbn,
  };
}

function toFormData(input: BookInput, resolution?: AddBookResolution): FormData {
  const formData = new FormData();
  formData.set("title", input.title);
  formData.set("authors", input.authors.join(", "));
  formData.set("openLibraryKey", input.openLibraryKey ?? "");
  formData.set("coverUrl", input.coverUrl ?? "");
  formData.set("isbn", input.isbn ?? "");
  if (resolution) {
    formData.set("resolution", resolution.action);
    if (resolution.action === "replace") {
      formData.set("existingBookId", resolution.existingBookId);
    }
  }
  return formData;
}

function BookCover({ coverUrl, label }: { coverUrl: string | null; label: string }) {
  return coverUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={coverUrl} alt="" className="h-16 w-12 rounded object-cover" />
  ) : (
    <div className="flex h-16 w-12 items-center justify-center rounded bg-secondary text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function DuplicateOption({
  heading,
  book,
  recommended,
  disabled,
  onKeep,
}: {
  heading: string;
  book: BookInput;
  recommended: boolean;
  disabled: boolean;
  onKeep: () => void;
}) {
  return (
    <div
      className={`flex flex-1 flex-col gap-2 rounded-xl border p-3 ${
        recommended ? "border-primary/60 bg-primary/5" : "border-border/80"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {heading}
        </p>
        {recommended ? <Badge>Recommended</Badge> : null}
      </div>
      <div className="flex gap-3">
        <BookCover coverUrl={book.coverUrl} label="No cover" />
        <div className="min-w-0">
          <p className="font-medium">{book.title}</p>
          <p className="text-sm text-muted-foreground">
            {book.authors.join(", ") || "Unknown author"}
          </p>
          <p className="text-xs text-muted-foreground">
            {book.isbn ? `ISBN ${book.isbn}` : "No ISBN"}
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant={recommended ? "default" : "secondary"}
        disabled={disabled}
        onClick={onKeep}
      >
        Keep this one
      </Button>
    </div>
  );
}

export function BookSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [pending, startTransition] = useTransition();
  const [adding, startAdding] = useTransition();
  const [duplicate, setDuplicate] = useState<PendingDuplicate | null>(null);
  const toast = useToast();

  function handleAddResult(result: AddBookResult) {
    switch (result.status) {
      case "added":
        setDuplicate(null);
        toast.success(`Added "${result.book.title}" to the library`);
        return;
      case "replaced":
        setDuplicate(null);
        toast.success(`Updated "${result.book.title}" with the new details`);
        return;
      case "already_in_library":
        setDuplicate(null);
        toast.message({
          title: `"${result.existing.title}" is already in your library`,
          description: "Same ISBN / barcode, so we kept the one you added first.",
        });
        return;
      case "possible_duplicate":
        setDuplicate({ incoming: result.incoming, candidates: result.candidates });
        return;
    }
  }

  function addBook(input: BookInput, resolution?: AddBookResolution) {
    startAdding(async () => {
      try {
        handleAddResult(await addBookAction(toFormData(input, resolution)));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add book");
      }
    });
  }

  function keepExisting(title: string) {
    setDuplicate(null);
    toast.message(`Kept the "${title}" already in your library`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Title, author, or ISBN / barcode"
          aria-label="Search books"
        />
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              try {
                const next = await searchBooksAction(query);
                setResults(next);
                if (next.length === 0) {
                  toast.message("No books matched that search");
                } else {
                  toast.success(
                    next.length === 1
                      ? "Found 1 book"
                      : `Found ${next.length} books`,
                  );
                }
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Search failed",
                );
              }
            });
          }}
        >
          {pending ? "Searching…" : "Search"}
        </Button>
      </div>
      <ul className="space-y-3">
        {results.map((book) => (
          <li
            key={book.sourceId}
            className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/70 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex gap-3">
              <BookCover coverUrl={book.coverUrl} label="No cover" />
              <div>
                <p className="font-medium">{book.title}</p>
                <p className="text-sm text-muted-foreground">
                  {book.authors.join(", ") || "Unknown author"}
                  {book.year ? ` · ${book.year}` : ""}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={adding}
              onClick={() => addBook(toBookInput(book))}
            >
              Add to library
            </Button>
          </li>
        ))}
      </ul>

      <Dialog
        open={duplicate !== null}
        onOpenChange={(open) => {
          if (!open) setDuplicate(null);
        }}
      >
        {duplicate ? (
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>This looks like a book you already have</DialogTitle>
              <DialogDescription>
                Same title and author, different ISBN. Pick which copy to keep.
                We recommend the one with more details, like a cover picture.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {duplicate.candidates.map(({ existing, recommended }) => {
                const pick = (keep: DuplicateKeep) => keep === recommended;
                return (
                  <div key={existing.id} className="flex flex-col gap-3 sm:flex-row">
                    <DuplicateOption
                      heading="In your library"
                      book={existing}
                      recommended={pick("existing")}
                      disabled={adding}
                      onKeep={() => keepExisting(existing.title)}
                    />
                    <DuplicateOption
                      heading="Just found"
                      book={duplicate.incoming}
                      recommended={pick("incoming")}
                      disabled={adding}
                      onKeep={() =>
                        addBook(duplicate.incoming, {
                          action: "replace",
                          existingBookId: existing.id,
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={adding}
                onClick={() => addBook(duplicate.incoming, { action: "keep_both" })}
              >
                Keep both
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function SessionBookPicker({
  books,
  selectedIds,
}: {
  books: { id: string; title: string }[];
  selectedIds: string[];
}) {
  const [selected, setSelected] = useState(selectedIds);
  return (
    <details className="group rounded-lg border border-input bg-background">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-ring sm:text-sm [&::-webkit-details-marker]:hidden">
        <span>
          Books from library ·{" "}
          {selected.length ? `${selected.length} selected` : "Choose books"}
        </span>
        <ChevronDown
          className="size-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="max-h-64 overflow-y-auto border-t border-border p-2">
        {books.length ? (
          books.map((book) => (
            <label
              key={book.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-secondary"
            >
              <input
                type="checkbox"
                name="bookIds"
                value={book.id}
                checked={selected.includes(book.id)}
                className="size-4 shrink-0 accent-primary"
                onChange={(event) =>
                  setSelected((ids) =>
                    event.target.checked
                      ? [...ids, book.id]
                      : ids.filter((id) => id !== book.id),
                  )
                }
              />
              <span className="min-w-0 break-words">{book.title}</span>
            </label>
          ))
        ) : (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            Your library is empty. Add books in Library or enter a title below.
          </p>
        )}
      </div>
    </details>
  );
}

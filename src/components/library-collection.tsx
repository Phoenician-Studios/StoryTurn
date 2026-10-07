"use client";
import { useState } from "react";
import { correctFormatAction, removeBooksAction } from "@/app/book-actions";
import { editionLabel } from "@/lib/book-edition";
import type { Book } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
function FormatCorrection({ book }: { book: Book }) {
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="mt-2 flex flex-wrap gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        try {
          await correctFormatAction(book.id, label);
        } catch {
          setError("Could not set format. Refresh and retry.");
        } finally {
          setPending(false);
        }
      }}
    >
      <Input
        aria-label={`Format for ${book.title}`}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        maxLength={80}
        required
        placeholder="Format, e.g. Paperback"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Saving…" : "Set format"}
      </Button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
export function LibraryCollection({ books }: { books: Book[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant="destructive"
          disabled={!selected.length}
          onClick={() => setOpen(true)}
        >
          Remove selected ({selected.length})
        </Button>
        <Button
          variant="outline"
          onClick={() => setSelected(books.slice(0, 100).map((b) => b.id))}
        >
          Select up to 100
        </Button>
        <Button variant="outline" onClick={() => setSelected([])}>
          Clear selection
        </Button>
      </div>
      {message && (
        <p role="status" className="mt-3">
          {message}
        </p>
      )}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {books.map((book) => (
          <li
            key={book.id}
            className="story-panel flex items-start gap-3 rounded-2xl px-4 py-3"
          >
            <input
              type="checkbox"
              aria-label={`Select ${book.title} (${editionLabel(book)})`}
              checked={selected.includes(book.id)}
              onChange={(e) =>
                setSelected((ids) =>
                  e.target.checked
                    ? [...ids, book.id].slice(0, 100)
                    : ids.filter((id) => id !== book.id),
                )
              }
            />
            {book.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.coverUrl}
                alt=""
                className="h-14 w-10 shrink-0 rounded object-cover"
              />
            )}
            <div className="min-w-0 break-words">
              <p className="font-medium">{book.title}</p>
              <p>{book.authors.join(", ") || "Unknown author"}</p>
              <p className="text-sm text-muted-foreground">{editionLabel(book)}</p>
              {!book.editionKey && (
                <p className="text-xs text-muted-foreground">
                  Legacy entry: edition unverified
                </p>
              )}
              {!book.format && <FormatCorrection book={book} />}
            </div>
          </li>
        ))}
      </ul>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <DialogContent showCloseButton={!pending}>
          <DialogTitle>Remove {selected.length} selected books?</DialogTitle>
          <DialogDescription>
            This removes books from the shared family library. Books used in reading
            sessions will be kept to preserve your history.
          </DialogDescription>
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Keep books
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                const results = await removeBooksAction(selected);
                const removed = results.filter((r) => r.status === "removed").length;
                const kept = results.filter((r) => r.status === "referenced");
                const names = kept.map(
                  (r) => books.find((b) => b.id === r.id)?.title ?? "Book",
                );
                setMessage(
                  `${removed} removed.${kept.length ? ` Kept because used in reading sessions: ${names.join(", ")}.` : ""}${results.some((r) => r.status === "unavailable") ? " Some books were unavailable." : ""}`,
                );
                setSelected([]);
                setOpen(false);
              } catch {
                setMessage("Could not remove books. Please retry.");
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Removing…" : "Remove books"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

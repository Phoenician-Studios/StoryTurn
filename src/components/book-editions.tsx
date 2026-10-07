"use client";
import { useState } from "react";
import { editionsAction, addEditionAction } from "@/app/book-actions";
import { editionLabel } from "@/lib/book-edition";
import { Button } from "@/components/ui/button";
type Edition = Awaited<ReturnType<typeof editionsAction>>["entries"][number];
export function BookEditions({
  workKey,
  collectionKeys,
}: {
  workKey: string;
  collectionKeys: string[];
}) {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [more, setMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  async function load() {
    setPending("load");
    setError("");
    try {
      const result = await editionsAction(workKey, offset);
      setEditions((current) => [...current, ...result.entries]);
      setMore(result.hasMore);
      setOffset((current) => current + 10);
      setLoaded(true);
    } catch {
      setError("Could not load editions. Please retry.");
    } finally {
      setPending(null);
    }
  }
  return (
    <div className="col-span-full space-y-2">
      {!loaded && (
        <Button
          size="sm"
          variant="secondary"
          disabled={!!pending}
          onClick={() => void load()}
        >
          {pending ? "Loading editions…" : "Choose edition"}
        </Button>
      )}
      {loaded && !editions.length && <p>No editions found. Try the ISBN scanner.</p>}
      {editions.map((edition) => {
        const collected = [...collectionKeys, ...added].includes(edition.editionKey);
        return (
          <div key={edition.editionKey} className="space-y-2 rounded border p-2">
            <p>{edition.title}</p>
            <p className="text-sm text-muted-foreground">{editionLabel(edition)}</p>
            <Button
              size="sm"
              variant="secondary"
              disabled={collected || !!pending}
              onClick={async () => {
                setPending(edition.editionKey);
                setError("");
                try {
                  const result = await addEditionAction(edition.editionKey);
                  if (result.ok) setAdded((current) => [...current, edition.editionKey]);
                  else setError(result.error);
                } catch {
                  setError("Could not add edition. Please retry.");
                } finally {
                  setPending(null);
                }
              }}
            >
              {pending === edition.editionKey
                ? "Adding…"
                : collected
                  ? "In collection"
                  : "Add to library"}
            </Button>
          </div>
        );
      })}
      {more && (
        <Button
          size="sm"
          variant="outline"
          disabled={!!pending}
          onClick={() => void load()}
        >
          More editions
        </Button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getCurrentMember,
  reserveBookLookup,
  startBookScan,
  finishBookScan,
  saveBookEdition,
  removeLibraryBooks,
  correctBookFormat,
} from "@/lib/data";
import { getWorkEditions, lookupEdition, lookupIsbn } from "@/lib/open-library";
import {
  isGoogleBooksConfigured,
  lookupGoogleBooksByIsbn,
} from "@/lib/google-books";
import {
  parseScannedBookCode,
  scannedBookCodeMessage,
} from "@/lib/isbn";
import type { BookInput } from "@/lib/book-edition";

async function authorize() {
  if (!(await getCurrentMember())) throw new Error("Join a family first");
}
const options = { beforeRequest: reserveBookLookup };

async function lookupScanEdition(isbn: string): Promise<BookInput | null> {
  try {
    const ol = await lookupIsbn(isbn, options);
    if (ol) return ol;
  } catch {
    // Fall through to Google Books when configured.
  }

  if (!isGoogleBooksConfigured()) return null;

  try {
    await reserveBookLookup();
    const google = await lookupGoogleBooksByIsbn(isbn, {
      limit: 1,
      apiKey: process.env.GOOGLE_BOOKS_API_KEY?.trim() || null,
    });
    const hit = google[0];
    if (!hit) return null;
    return {
      title: hit.title,
      authors: hit.authors,
      openLibraryKey: null,
      coverUrl: hit.coverUrl,
      isbn: hit.isbn ?? isbn,
      editionKey: hit.googleBooksId
        ? `google:${hit.googleBooksId}`
        : `isbn:${isbn}`,
      format: null,
      publisher: null,
      editionYear: hit.year ? String(hit.year) : null,
    };
  } catch {
    return null;
  }
}

export async function startScanAction() {
  await authorize();
  return startBookScan();
}
export async function finishScanAction(id: string) {
  await authorize();
  await finishBookScan(z.string().uuid().parse(id));
  revalidatePath("/library");
}
export async function scanBookAction(value: string, sessionId: string) {
  await authorize();
  z.string().uuid().parse(sessionId);
  const parsed = parseScannedBookCode(value);
  if (!parsed.ok)
    return {
      ok: false as const,
      error: scannedBookCodeMessage(parsed.reason),
      kind: "invalid" as const,
    };
  const isbn = parsed.isbn13;
  let edition: BookInput | null;
  try {
    edition = await lookupScanEdition(isbn);
  } catch {
    return {
      ok: false as const,
      error: "Lookup unavailable. Retry this ISBN or search by title.",
      kind: "lookup" as const,
    };
  }
  if (!edition)
    return {
      ok: false as const,
      error: isGoogleBooksConfigured()
        ? "No ISBN match. Try title search."
        : "No ISBN match. Set GOOGLE_BOOKS_API_KEY for better barcode coverage, or try title search.",
      kind: "unknown" as const,
    };
  try {
    const result = await saveBookEdition(edition, sessionId);
    revalidatePath("/library");
    return { ok: true as const, ...result };
  } catch {
    return {
      ok: false as const,
      error: "Could not save book. Retry while this scan session is open.",
      kind: "save" as const,
      book: edition,
    };
  }
}
export async function editionsAction(workKey: string, offset = 0) {
  await authorize();
  try {
    return await getWorkEditions(workKey, offset, options);
  } catch {
    throw new Error("Could not load editions. Please retry.");
  }
}
export async function addEditionAction(editionKey: string) {
  await authorize();
  try {
    const edition = await lookupEdition(editionKey, options);
    if (!edition)
      return {
        ok: false as const,
        error: "Edition unavailable. Choose another edition.",
      };
    const result = await saveBookEdition(edition);
    revalidatePath("/library");
    return { ok: true as const, ...result };
  } catch {
    return { ok: false as const, error: "Could not add edition. Please retry." };
  }
}
export async function removeBooksAction(ids: string[], scanId?: string) {
  await authorize();
  z.array(z.string().min(1).max(100)).min(1).max(100).parse(ids);
  if (scanId) z.string().uuid().parse(scanId);
  const results = await removeLibraryBooks(ids, scanId);
  revalidatePath("/library");
  return results;
}
export async function correctFormatAction(id: string, format: string) {
  await authorize();
  z.string().min(1).max(100).parse(id);
  const label = z.string().trim().min(1).max(80).parse(format);
  await correctBookFormat(id, label);
  revalidatePath("/library");
}

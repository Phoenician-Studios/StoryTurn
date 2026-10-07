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
import { normalizeIsbn } from "@/lib/isbn";

async function authorize() {
  if (!(await getCurrentMember())) throw new Error("Join a family first");
}
const options = { beforeRequest: reserveBookLookup };
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
  const isbn = normalizeIsbn(value);
  if (!isbn)
    return {
      ok: false as const,
      error: "Unsupported code. Enter a valid ISBN-10 or ISBN-13.",
      kind: "invalid" as const,
    };
  let edition;
  try {
    edition = await lookupIsbn(isbn, options);
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
      error: "No ISBN match. Try title search.",
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

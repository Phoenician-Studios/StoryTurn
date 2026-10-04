"use server";

import { getLibraryPage } from "@/lib/data";

export async function searchLibraryBooksAction(query: string, page = 1) {
  return getLibraryPage(query, page);
}

/** Strip spaces, hyphens, and other separators; keep digits and ISBN-10 X. */
export function compactBookCode(raw: string): string {
  return raw.trim().replace(/[^0-9Xx]/g, "").toUpperCase();
}

/**
 * True when the query looks like a scanned/pasted ISBN or UPC barcode
 * rather than a free-text title/author search.
 */
export function looksLikeBookCode(query: string): boolean {
  const compact = compactBookCode(query);
  if (/^\d{9}[\dX]$/.test(compact)) return true;
  if (/^\d{12}$/.test(compact)) return true;
  if (/^\d{13}$/.test(compact)) return true;
  return false;
}

function isbn13CheckDigit(first12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(first12[i]);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

/** Convert ISBN-10 to ISBN-13 (Bookland 978 prefix). */
export function isbn10ToIsbn13(isbn10: string): string | null {
  const compact = compactBookCode(isbn10);
  if (!/^\d{9}[\dX]$/.test(compact)) return null;
  const core = `978${compact.slice(0, 9)}`;
  return `${core}${isbn13CheckDigit(core)}`;
}

/**
 * Normalize a scanned/pasted UPC-A, EAN-13 Bookland, ISBN-10, or ISBN-13
 * into ISBN-13 when possible. Returns null when the code is not bookland.
 */
export function normalizeToIsbn13(raw: string): string | null {
  const compact = compactBookCode(raw);
  if (!compact) return null;

  if (/^\d{13}$/.test(compact)) {
    if (compact.startsWith("978") || compact.startsWith("979")) {
      return compact;
    }
    return null;
  }

  if (/^\d{12}$/.test(compact)) {
    // Scanner dropped the ISBN-13 check digit from a Bookland code.
    if (compact.startsWith("978") || compact.startsWith("979")) {
      return `${compact}${isbn13CheckDigit(compact)}`;
    }
    // UPC-A → EAN-13 by prepending 0; keep only Bookland results.
    const ean13 = `0${compact}`;
    if (ean13.startsWith("978") || ean13.startsWith("979")) {
      return ean13;
    }
    return null;
  }

  if (/^\d{9}[\dX]$/.test(compact)) {
    return isbn10ToIsbn13(compact);
  }

  return null;
}

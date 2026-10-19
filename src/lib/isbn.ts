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

export function isbn13CheckDigit(first12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(first12[i]);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

function isbn10CheckOk(isbn10: string): boolean {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = isbn10[i];
    const value = ch === "X" ? 10 : Number(ch);
    sum += value * (10 - i);
  }
  return sum % 11 === 0;
}

export function isValidIsbn13CheckDigit(isbn13: string): boolean {
  const compact = compactBookCode(isbn13);
  if (!/^\d{13}$/.test(compact)) return false;
  return isbn13CheckDigit(compact.slice(0, 12)) === compact[12];
}

/** Convert ISBN-10 to ISBN-13 (Bookland 978 prefix). Does not require a valid check digit. */
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

/**
 * Strict bookland ISBN for shelf scan / OL `/isbn/` paths.
 * Requires a valid check digit. Also accepts 12-digit Bookland (missing
 * check digit) and Bookland UPC-A via {@link normalizeToIsbn13}.
 */
export function normalizeIsbn(value: string): string | null {
  const parsed = parseScannedBookCode(value);
  return parsed.ok ? parsed.isbn13 : null;
}

export type ScannedBookCodeError =
  | "empty"
  | "invalid_check_digit"
  | "unsupported";

export type ScannedBookCodeResult =
  | { ok: true; isbn13: string }
  | { ok: false; reason: ScannedBookCodeError };

/**
 * Parse a camera/manual shelf-scan code into ISBN-13.
 * Accepts ISBN-10, ISBN-13, and Bookland UPC-A; rejects bad check digits.
 */
export function parseScannedBookCode(raw: string): ScannedBookCodeResult {
  const compact = compactBookCode(raw);
  if (!compact) return { ok: false, reason: "empty" };

  if (/^\d{9}[\dX]$/.test(compact)) {
    if (!isbn10CheckOk(compact)) {
      return { ok: false, reason: "invalid_check_digit" };
    }
    const isbn13 = isbn10ToIsbn13(compact);
    if (!isbn13) return { ok: false, reason: "unsupported" };
    return { ok: true, isbn13 };
  }

  if (/^\d{13}$/.test(compact)) {
    if (!(compact.startsWith("978") || compact.startsWith("979"))) {
      return { ok: false, reason: "unsupported" };
    }
    if (!isValidIsbn13CheckDigit(compact)) {
      return { ok: false, reason: "invalid_check_digit" };
    }
    return { ok: true, isbn13: compact };
  }

  const normalized = normalizeToIsbn13(compact);
  if (!normalized) return { ok: false, reason: "unsupported" };
  if (!isValidIsbn13CheckDigit(normalized)) {
    return { ok: false, reason: "invalid_check_digit" };
  }
  return { ok: true, isbn13: normalized };
}

export function scannedBookCodeMessage(reason: ScannedBookCodeError): string {
  switch (reason) {
    case "empty":
      return "Enter an ISBN-10, ISBN-13, or book barcode.";
    case "invalid_check_digit":
      return "That ISBN check digit doesn’t match. Double-check the digits.";
    case "unsupported":
      return "Unsupported barcode. Use the book’s ISBN-10 or ISBN-13.";
  }
}

/** ISBN-13 (978…) → ISBN-10. 979 codes have no ISBN-10 form. */
export function isbn13ToIsbn10(isbn13: string): string | null {
  const compact = compactBookCode(isbn13);
  if (!/^978\d{10}$/.test(compact)) return null;
  const core = compact.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(core[i]) * (10 - i);
  }
  const check = (11 - (sum % 11)) % 11;
  return `${core}${check === 10 ? "X" : String(check)}`;
}

/** Accept ISBN-10/13, never general retail UPCs or supplementary price codes. */
export function normalizeIsbn(value: string): string | null {
  const code = value.replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{9}[\dX]$/.test(code)) {
    const sum = [...code].reduce(
      (n, digit, i) => n + (digit === "X" ? 10 : Number(digit)) * (10 - i),
      0,
    );
    if (sum % 11) return null;
    const prefix = `978${code.slice(0, 9)}`;
    const check =
      (10 -
        ([...prefix].reduce((n, digit, i) => n + Number(digit) * (i % 2 ? 3 : 1), 0) %
          10)) %
      10;
    return `${prefix}${check}`;
  }
  if (!/^97[89]\d{10}$/.test(code)) return null;
  return [...code].reduce((n, digit, i) => n + Number(digit) * (i % 2 ? 3 : 1), 0) %
    10 ===
    0
    ? code
    : null;
}

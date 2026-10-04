export function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return Boolean(value);
  } catch {
    return false;
  }
}

export function timezoneLabel(zone: string): string {
  const place = zone.replaceAll("_", " ").replaceAll("/", " / ");
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "longGeneric",
  })
    .formatToParts()
    .find((part) => part.type === "timeZoneName")?.value;
  return `${place} (${name})`;
}

export function timezoneOptions(extraZones: string[] = []) {
  const zones = new Set([
    "UTC",
    ...Intl.supportedValuesOf("timeZone"),
    ...extraZones.filter(isValidTimezone),
  ]);
  return [...zones].sort().map((value) => ({ value, label: timezoneLabel(value) }));
}

/** Stored session timestamps are local wall time, so compare calendar dates in the family's zone. */
export function dateInTimezone(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

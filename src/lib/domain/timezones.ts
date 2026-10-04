const labelCache = new Map<string, string>();
let baseOptions: { value: string; label: string }[] | undefined;

export function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return Boolean(value);
  } catch {
    return false;
  }
}

export function timezoneLabel(zone: string): string {
  const cached = labelCache.get(zone);
  if (cached) return cached;
  const place = zone.replaceAll("_", " ").replaceAll("/", " / ");
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "longGeneric",
  })
    .formatToParts()
    .find((part) => part.type === "timeZoneName")?.value;
  const label = `${place} (${name})`;
  labelCache.set(zone, label);
  return label;
}

export function timezoneOptions(extraZones: string[] = []) {
  baseOptions ??= ["UTC", ...Intl.supportedValuesOf("timeZone")]
    .sort()
    .map((value) => ({ value, label: timezoneLabel(value) }));
  const supported = new Set(baseOptions.map((option) => option.value));
  const extras = [...new Set(extraZones)]
    .filter((zone) => !supported.has(zone) && isValidTimezone(zone))
    .map((value) => ({ value, label: timezoneLabel(value) }));
  if (extras.length === 0) return baseOptions;
  return [...baseOptions, ...extras].sort((a, b) => a.value.localeCompare(b.value));
}

export { dateInTimezone } from "@/lib/domain/calendar-date";

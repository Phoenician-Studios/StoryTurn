"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { timezoneOptions } from "@/lib/domain/timezones";

const subscribe = () => () => {};
const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverTimezone = () => "";

export function TimezonePicker({ defaultValue }: { defaultValue?: string }) {
  const detected = useSyncExternalStore(subscribe, browserTimezone, serverTimezone);
  const [chosen, setChosen] = useState<string | null>(defaultValue ?? null);
  const [search, setSearch] = useState("");
  const value = chosen ?? detected;
  const options = useMemo(() => timezoneOptions([value]), [value]);
  const query = search.toLocaleLowerCase().replaceAll("kathmandu", "katmandu");
  const visible = options.filter(
    (option) =>
      option.value === value ||
      option.label
        .toLocaleLowerCase()
        .replaceAll("kathmandu", "katmandu")
        .includes(query),
  );

  return (
    <div className="space-y-2">
      <Label htmlFor="timezone">Timezone</Label>
      <Input
        type="search"
        aria-label="Search timezones by city or region"
        placeholder="Search city or region, e.g. Chicago"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <select
        id="timezone"
        name="timezone"
        required
        value={value}
        onChange={(event) => setChosen(event.target.value)}
        aria-describedby="timezone-help"
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="" disabled>
          Choose your timezone
        </option>
        {visible.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        disabled={!detected}
        onClick={() => {
          setChosen(detected);
          setSearch("");
        }}
      >
        Use my timezone
      </Button>
      <p id="timezone-help" className="text-sm text-muted-foreground">
        Choose the timezone where your family reads. Bedtime stays in local time when
        daylight saving time changes.
      </p>
    </div>
  );
}

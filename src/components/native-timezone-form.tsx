"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};
const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverTimezone = () => "";

export function NativeTimezoneForm({
  action,
  children,
}: {
  action: (data: FormData) => void | Promise<void>;
  children?: ReactNode;
}) {
  const timezone = useSyncExternalStore(subscribe, browserTimezone, serverTimezone);
  return (
    <form action={action} className="story-panel mt-6 rounded-2xl p-5 animate-rise-delay">
      <input type="hidden" name="timezone" value={timezone} />
      <fieldset disabled={!timezone} className="space-y-4">
        {children}
      </fieldset>
      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        {timezone
          ? "Bedtime uses your device’s local timezone automatically."
          : "Detecting your device’s timezone…"}
      </p>
      <noscript>Enable JavaScript to save a schedule in your local timezone.</noscript>
    </form>
  );
}

"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { NativeSelect } from "@/components/ui/native-select";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

type FormSelectProps = {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  id?: string;
  "aria-label"?: string;
  className?: string;
};

export function FormSelect({
  name,
  defaultValue,
  options,
  id,
  "aria-label": ariaLabel,
  className,
}: FormSelectProps) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const captureNativeValue = useCallback((node: HTMLSelectElement | null) => {
    // Preserve a selection made before React attached event handlers.
    if (node) setSelectedValue(node.value);
  }, []);

  if (!hydrated) {
    return (
      <NativeSelect
        ref={captureNativeValue}
        id={id}
        name={name}
        aria-label={ariaLabel}
        className={className}
        defaultValue={defaultValue}
        onChange={(event) => setSelectedValue(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    );
  }

  return (
    <Select name={name} defaultValue={selectedValue} items={options}>
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={`min-h-11 w-full text-base sm:text-sm ${className ?? ""}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

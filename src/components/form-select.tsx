"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  return (
    <Select name={name} defaultValue={defaultValue} items={options}>
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

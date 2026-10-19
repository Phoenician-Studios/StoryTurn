"use client";

import type { ComponentProps } from "react";
import { NativeSelect } from "@/components/ui/native-select";

export function AutoSubmitSelect(props: ComponentProps<typeof NativeSelect>) {
  return (
    <NativeSelect
      {...props}
      onChange={(event) => {
        props.onChange?.(event);
        event.currentTarget.form?.requestSubmit();
      }}
    />
  );
}

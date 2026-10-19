"use client";

import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      theme="light"
      position="top-center"
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "border border-border bg-card text-foreground shadow-md font-sans",
          title: "font-medium text-foreground",
          description: "text-muted-foreground",
          success: "border-primary/30 bg-card",
          error: "border-destructive/40 bg-card",
          closeButton: "border-border bg-card text-foreground",
        },
      }}
      {...props}
    />
  );
}

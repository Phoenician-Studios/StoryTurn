"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyInviteLink({ code }: { code: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={async () => {
          try {
            const url = new URL("/join", window.location.origin);
            url.searchParams.set("code", code);
            await navigator.clipboard.writeText(url.toString());
            setStatus("copied");
          } catch {
            setStatus("error");
          }
        }}
      >
        {status === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {status === "copied" ? "Copied!" : "Copy invite link"}
      </Button>
      <span role="status" className="text-sm text-muted-foreground">
        {status === "error"
          ? "Could not copy. Please try again."
          : status === "copied"
            ? "Invite link copied."
            : ""}
      </span>
    </div>
  );
}

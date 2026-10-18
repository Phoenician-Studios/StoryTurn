"use client";

import { createInviteAction } from "@/app/actions";
import { ToastForm } from "@/components/toast-form";
import { Button } from "@/components/ui/button";

export function CreateInviteForm() {
  return (
    <ToastForm
      action={createInviteAction}
      successMessage={(result) => {
        const code =
          result &&
          typeof result === "object" &&
          "code" in result &&
          typeof (result as { code: unknown }).code === "string"
            ? (result as { code: string }).code
            : null;
        return code
          ? { title: "Invite code created", description: code }
          : "Invite code created";
      }}
    >
      <Button type="submit" variant="secondary">
        Generate code
      </Button>
    </ToastForm>
  );
}

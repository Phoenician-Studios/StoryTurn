"use client";

import { createInviteAction } from "@/app/actions";
import { ToastForm } from "@/components/toast-form";
import { Button } from "@/components/ui/button";
import { appUrl } from "@/lib/config";
import { invitePath } from "@/lib/domain/invites";

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
          ? {
              title: "Invite link ready",
              description: `${appUrl()}${invitePath(code)}`,
            }
          : "Invite link ready";
      }}
    >
      <Button type="submit" variant="secondary">
        Generate code
      </Button>
    </ToastForm>
  );
}

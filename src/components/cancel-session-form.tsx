"use client";

import { cancelSessionAction } from "@/app/actions";
import { ConfirmationForm } from "@/components/confirmation-form";
import { Button } from "@/components/ui/button";

export function CancelSessionForm({ sessionId }: { sessionId: string }) {
  return (
    <ConfirmationForm
      title="Cancel this session?"
      description="This night will be marked as canceled and its calendar invite will be canceled."
      confirmLabel="Cancel session"
      action={async () => {
        await cancelSessionAction(sessionId);
      }}
      className="mt-4"
    >
      <Button type="submit" variant="destructive">
        Cancel this reading session
      </Button>
    </ConfirmationForm>
  );
}

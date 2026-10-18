"use client";

import { cancelSessionAction } from "@/app/actions";
import { ToastForm } from "@/components/toast-form";
import { Button } from "@/components/ui/button";

export function CancelSessionForm({ sessionId }: { sessionId: string }) {
  return (
    <ToastForm
      action={async () => {
        await cancelSessionAction(sessionId);
      }}
      successMessage="Reading session cancelled"
      className="mt-4"
    >
      <Button type="submit" variant="destructive">
        Cancel this reading session
      </Button>
    </ToastForm>
  );
}

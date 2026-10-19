"use client";

import type { ComponentProps } from "react";
import { unstable_rethrow } from "next/navigation";
import { useToast, type ToastMessage } from "@/hooks/use-toast";

type ServerFormAction =
  | ((formData: FormData) => Promise<unknown>)
  | (() => Promise<unknown>);

type ToastFormProps = Omit<ComponentProps<"form">, "action"> & {
  action: ServerFormAction;
  successMessage: ToastMessage | ((result: unknown) => ToastMessage);
  errorMessage?: ToastMessage;
  /** Set when the server action calls `redirect()` so the toast survives navigation. */
  redirects?: boolean;
  /**
   * React 19 resets forms after a successful action. Set false when the submitted
   * values should remain visible (e.g. an edit form that is not cleared).
   */
  resetOnSuccess?: boolean;
};

function resolveMessage(
  message: ToastMessage | ((result: unknown) => ToastMessage),
  result: unknown,
): ToastMessage {
  return typeof message === "function" ? message(result) : message;
}

export function ToastForm({
  action,
  successMessage,
  errorMessage = "Something went wrong",
  redirects = false,
  resetOnSuccess = true,
  onReset,
  children,
  ...formProps
}: ToastFormProps) {
  const toast = useToast();

  return (
    <form
      {...formProps}
      onReset={(event) => {
        if (!resetOnSuccess) {
          event.preventDefault();
        }
        onReset?.(event);
      }}
      action={async (formData) => {
        try {
          if (redirects) {
            toast.flashSuccess(resolveMessage(successMessage, undefined));
          }
          const result = await action(formData);
          if (!redirects) {
            toast.success(resolveMessage(successMessage, result));
          }
        } catch (error) {
          unstable_rethrow(error);
          toast.clearFlash();
          toast.error(
            error instanceof Error
              ? error.message
              : typeof errorMessage === "string"
                ? errorMessage
                : errorMessage.title,
          );
        }
      }}
    >
      {children}
    </form>
  );
}

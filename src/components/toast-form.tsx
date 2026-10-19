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
  children,
  ...formProps
}: ToastFormProps) {
  const toast = useToast();

  return (
    <form
      {...formProps}
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

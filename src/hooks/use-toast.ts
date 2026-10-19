"use client";

import { toast as sonnerToast } from "sonner";
import {
  clearToastFlash,
  consumeToastFlash,
  queueToastFlash,
  type ToastFlash,
} from "@/lib/toast-flash";

export type ToastMessage = string | { title: string; description?: string };

function normalize(message: ToastMessage): { title: string; description?: string } {
  if (typeof message === "string") return { title: message };
  return message;
}

function showFlash(flash: ToastFlash): void {
  const opts = flash.description ? { description: flash.description } : undefined;
  if (flash.type === "success") sonnerToast.success(flash.title, opts);
  else if (flash.type === "error") sonnerToast.error(flash.title, opts);
  else sonnerToast.message(flash.title, opts);
}

const toastApi = {
  success(message: ToastMessage) {
    const { title, description } = normalize(message);
    sonnerToast.success(title, description ? { description } : undefined);
  },
  error(message: ToastMessage) {
    const { title, description } = normalize(message);
    sonnerToast.error(title, description ? { description } : undefined);
  },
  message(message: ToastMessage) {
    const { title, description } = normalize(message);
    sonnerToast.message(title, description ? { description } : undefined);
  },
  /** Queue a toast that survives a server-action redirect. */
  flashSuccess(message: ToastMessage) {
    const { title, description } = normalize(message);
    queueToastFlash({ type: "success", title, description });
  },
  flashError(message: ToastMessage) {
    const { title, description } = normalize(message);
    queueToastFlash({ type: "error", title, description });
  },
  clearFlash() {
    clearToastFlash();
  },
  /** Drain a queued flash toast (used by the global provider). */
  drainFlash() {
    const flash = consumeToastFlash();
    if (flash) showFlash(flash);
  },
} as const;

export function useToast() {
  return toastApi;
}

export type UseToast = typeof toastApi;

export type ToastFlash = {
  type: "success" | "error" | "message";
  title: string;
  description?: string;
};

const FLASH_KEY = "storyturn:toast-flash";

export function queueToastFlash(flash: ToastFlash): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(FLASH_KEY, JSON.stringify(flash));
}

export function consumeToastFlash(): ToastFlash | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(FLASH_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(FLASH_KEY);
  try {
    return JSON.parse(raw) as ToastFlash;
  } catch {
    return null;
  }
}

export function clearToastFlash(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(FLASH_KEY);
}

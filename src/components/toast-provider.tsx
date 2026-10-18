"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { useToast } from "@/hooks/use-toast";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const toast = useToast();

  useEffect(() => {
    toast.drainFlash();
  }, [pathname, toast]);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

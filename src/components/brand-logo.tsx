import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/storyturn-logo.svg"
      alt="StoryTurn"
      width={510}
      height={128}
      className={cn("h-auto w-48 max-w-full", className)}
      priority
    />
  );
}

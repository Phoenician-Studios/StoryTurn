import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({
  href = "/",
  label = "Back to tonight",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-primary hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}

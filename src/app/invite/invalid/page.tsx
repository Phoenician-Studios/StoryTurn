export const dynamic = "force-dynamic";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function InvalidInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const reason = params.reason;
  const message =
    !reason || reason === "not-found"
      ? "That invite link is invalid or no longer exists. Ask a family owner for a fresh link."
      : reason;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="story-panel animate-rise space-y-4 rounded-2xl p-6">
        <p className="font-display text-3xl text-primary">StoryTurn</p>
        <h1 className="text-xl font-medium">Invite unavailable</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Link href="/login" className={cn(buttonVariants())}>
          Go to sign in
        </Link>
      </div>
    </main>
  );
}

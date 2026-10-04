import { BrandLogo } from "@/components/brand-logo";
import { BackLink } from "@/components/back-link";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { updatePasswordAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <BackLink href="/login" label="Back to sign in" />
      <div className="story-panel animate-rise rounded-2xl p-6">
        <BrandLogo />
        <h1 className="mt-2 text-xl font-medium">Choose a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the link from your email, then set a password of at least 6 characters.
        </p>
        {params.error && <p className="mt-3 text-sm text-destructive">{params.error}</p>}
        <form action={updatePasswordAction} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" name="password" type="password" required minLength={6} />
          </div>
          <Button type="submit" className="w-full">
            Update password
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

import { BrandLogo } from "@/components/brand-logo";
import { BackLink } from "@/components/back-link";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDemoMode } from "@/lib/config";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const demo = isDemoMode();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <BackLink href="/login" label="Back to sign in" />
      <div className="story-panel animate-rise rounded-2xl p-6">
        <BrandLogo />
        <h1 className="mt-2 text-xl font-medium">Reset password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {demo
            ? "Demo mode confirms the reset flow without sending mail."
            : "We'll email a link to choose a new password."}
        </p>
        {params.error && <p className="mt-3 text-sm text-destructive">{params.error}</p>}
        {params.sent && (
          <p className="mt-3 text-sm text-muted-foreground">
            {demo
              ? "Demo reset noted. You can sign in with any email."
              : "If that account exists, a reset link is on its way."}
          </p>
        )}
        {demo ? (
          <ResetPasswordForm />
        ) : (
          <form action={resetPasswordAction} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit" className="w-full">
              Send reset link
            </Button>
          </form>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

import { BrandLogo } from "@/components/brand-logo";
import { BackLink } from "@/components/back-link";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { loginAction, signupAction } from "@/app/actions";
import { ToastForm } from "@/components/toast-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDemoMode } from "@/lib/config";
import { findInviteByCode } from "@/lib/demo/store";
import { normalizeInviteCode } from "@/lib/domain/invites";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invite?: string }>;
}) {
  const params = await searchParams;
  const demo = isDemoMode();
  const inviteCode = params.invite ? normalizeInviteCode(params.invite) : null;
  const matched = inviteCode ? findInviteByCode(inviteCode) : null;
  const usableInvite = matched?.usable.ok ? matched.code : null;
  const familyName = matched?.usable.ok ? (matched.family?.name ?? null) : null;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <BackLink href="/login" label="Back to sign in" />
      <div className="story-panel animate-rise rounded-2xl p-6">
        <BrandLogo />
        <h1 className="mt-2 text-xl font-medium">Create your account</h1>
        {familyName ? (
          <p className="mt-1 text-sm text-muted-foreground">
            After you sign up, you&apos;ll join{" "}
            <span className="font-medium text-foreground">{familyName}</span> automatically.
            No need to enter the invite code again.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            {demo
              ? "In demo mode, signing up creates a local reader profile."
              : "Use email and password. You can also sign in with Google from the login page."}
          </p>
        )}
        {params.error && <p className="mt-3 text-sm text-destructive">{params.error}</p>}
        {demo ? (
          <ToastForm
            action={loginAction}
            successMessage="Account ready"
            redirects
            className="mt-5 space-y-4"
          >
            {usableInvite ? (
              <input type="hidden" name="invite" value={usableInvite} />
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="demo" />
            </div>
            <Button type="submit" className="w-full">Sign up</Button>
          </ToastForm>
        ) : (
          <form action={signupAction} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Name</Label>
              <Input id="displayName" name="displayName" placeholder="Alex" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full">Sign up</Button>
          </form>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={
              usableInvite
                ? `/login?invite=${encodeURIComponent(usableInvite)}`
                : "/login"
            }
            className="text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
import Link from "next/link";
import { loginAction } from "@/app/actions";
import { ToastForm } from "@/components/toast-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findInviteByCode } from "@/lib/demo/store";
import { normalizeInviteCode } from "@/lib/domain/invites";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  const inviteCode = params.invite
    ? normalizeInviteCode(params.invite)
    : null;
  const matched = inviteCode ? findInviteByCode(inviteCode) : null;
  const usableInvite =
    matched?.usable.ok ? matched.code : null;
  const familyName =
    matched?.usable.ok ? (matched.family?.name ?? null) : null;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="story-panel animate-rise rounded-2xl p-6">
        <p className="font-display text-3xl text-primary">StoryTurn</p>
        <h1 className="mt-2 text-xl font-medium">Create your account</h1>
        {familyName ? (
          <p className="mt-1 text-sm text-muted-foreground">
            After you sign up, you&apos;ll join{" "}
            <span className="font-medium text-foreground">{familyName}</span>{" "}
            automatically. No need to enter the invite code again.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            In demo mode, signing up just creates a local reader profile.
          </p>
        )}
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
            <Input id="password" name="password" type="password" required />
          </div>
          <Button type="submit" className="w-full">
            Sign up
          </Button>
        </ToastForm>
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

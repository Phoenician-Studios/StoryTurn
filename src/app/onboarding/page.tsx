import { ConfirmationForm } from "@/components/confirmation-form";
import { BrandLogo } from "@/components/brand-logo";
import { ArrowLeft } from "lucide-react";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import {
  createFamilyAction,
  joinFamilyAction,
  logoutAction,
} from "@/app/actions";
import { RelationSelect } from "@/components/relation-select";
import { ToastForm } from "@/components/toast-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findInviteByCode, joinFamily } from "@/lib/demo/store";
import { getCurrentMember, getCurrentUser } from "@/lib/data";
import { normalizeInviteCode } from "@/lib/domain/invites";
import { peekPendingInvite } from "@/lib/pending-invite";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (await getCurrentMember()) redirect("/");

  const params = await searchParams;
  const fromQuery = params.invite ? normalizeInviteCode(params.invite) : null;
  const pendingCode = fromQuery ?? (await peekPendingInvite());

  if (pendingCode) {
    try {
      joinFamily(pendingCode);
      redirect("/invite/consumed");
    } catch {
      // Fall through to the manual join form.
    }
  }

  const matched = pendingCode ? findInviteByCode(pendingCode) : null;
  const defaultCode = matched?.usable.ok ? matched.code : (pendingCode ?? "");

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-12">
      <ConfirmationForm
        action={logoutAction}
        title="Sign out?"
        description="You will return to the sign-in page."
        confirmLabel="Sign out"
      >
        <Button type="submit" variant="ghost" className="gap-2">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to sign in
        </Button>
      </ConfirmationForm>
      <div className="animate-rise">
        <BrandLogo className="w-64" />
        <h1 className="mt-2 text-2xl font-medium">Create or join a family</h1>
        <p className="mt-1 text-muted-foreground">
          Parents, grandparents, and other readers all join the same family with an invite
          code.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ToastForm
          action={createFamilyAction}
          successMessage="Family created"
          redirects
          className="story-panel animate-rise space-y-4 rounded-2xl p-5"
        >
          <h2 className="font-display text-xl">Create a family</h2>
          <div className="space-y-2">
            <Label htmlFor="name">Family name</Label>
            <Input id="name" name="name" placeholder="The Riveras" required />
          </div>
          <RelationSelect defaultValue="parent" id="create-relation" />
          <Button type="submit">Create family</Button>
        </ToastForm>
        <ToastForm
          action={joinFamilyAction}
          successMessage="Joined family"
          redirects
          className="story-panel animate-rise-delay space-y-4 rounded-2xl p-5"
        >
          <h2 className="font-display text-xl">Join with invite</h2>
          <div className="space-y-2">
            <Label htmlFor="code">Invite code</Label>
            <Input
              id="code"
              name="code"
              placeholder="RIVERA24"
              required
              defaultValue={defaultCode}
            />
          </div>
          <RelationSelect defaultValue="other" id="join-relation" />
          <Button type="submit" variant="secondary">
            Join family
          </Button>
        </ToastForm>
      </div>
    </main>
  );
}

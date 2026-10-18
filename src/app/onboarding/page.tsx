export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createFamilyAction, joinFamilyAction } from "@/app/actions";
import { RelationSelect } from "@/components/relation-select";
import { ToastForm } from "@/components/toast-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  findInviteByCode,
  getCurrentMember,
  getCurrentUser,
  joinFamily,
} from "@/lib/demo/store";
import { normalizeInviteCode } from "@/lib/domain/invites";
import { peekPendingInvite } from "@/lib/pending-invite";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const user = getCurrentUser();
  if (!user) redirect("/login");
  if (getCurrentMember()) redirect("/");

  const params = await searchParams;
  const fromQuery = params.invite
    ? normalizeInviteCode(params.invite)
    : null;
  // Cookie is readable in RSC; joining uses the code directly (no cookie writes here).
  const pendingCode = fromQuery ?? (await peekPendingInvite());

  if (pendingCode) {
    try {
      joinFamily(pendingCode);
      // Clear the pending-invite cookie via a route handler (RSC cannot mutate cookies).
      redirect("/invite/consumed");
    } catch {
      // Fall through to the manual join form.
    }
  }

  const matched = pendingCode ? findInviteByCode(pendingCode) : null;
  const defaultCode =
    matched?.usable.ok ? matched.code : (pendingCode ?? "");

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-12">
      <div className="animate-rise">
        <p className="font-display text-4xl text-primary">StoryTurn</p>
        <h1 className="mt-2 text-2xl font-medium">Create or join a family</h1>
        <p className="mt-1 text-muted-foreground">
          Parents, grandparents, and other readers all join the same family with
          an invite code.
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

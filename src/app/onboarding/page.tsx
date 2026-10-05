import { ConfirmationForm } from "@/components/confirmation-form";
import { BrandLogo } from "@/components/brand-logo";
import { ArrowLeft } from "lucide-react";
export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createFamilyAction, joinFamilyAction, logoutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentMember, getCurrentUser } from "@/lib/data";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (await getCurrentMember()) redirect("/");

  const inviteCode = (await cookies()).get("storyturn-invite")?.value;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-12">
      <ConfirmationForm
        action={logoutAction}
        title="Sign out?"
        description="You will return to the sign-in page."
        confirmLabel="Sign out"
      >
        <Button type="submit" variant="ghost" className="min-h-11 gap-2">
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
        <form
          action={createFamilyAction}
          className="story-panel animate-rise rounded-2xl p-5 space-y-4"
        >
          <h2 className="font-display text-xl">Create a family</h2>
          <div className="space-y-2">
            <Label htmlFor="name">Family name</Label>
            <Input id="name" name="name" placeholder="The Riveras" required />
          </div>
          <Button type="submit">Create family</Button>
        </form>
        <form
          action={joinFamilyAction}
          className="story-panel animate-rise-delay rounded-2xl p-5 space-y-4"
        >
          <h2 className="font-display text-xl">Join with invite</h2>
          <div className="space-y-2">
            <Label htmlFor="code">Invite code</Label>
            <Input
              id="code"
              name="code"
              placeholder="RIVERA24"
              defaultValue={inviteCode}
              required
            />
          </div>
          <Button type="submit" variant="secondary">
            Join family
          </Button>
        </form>
      </div>
    </main>
  );
}

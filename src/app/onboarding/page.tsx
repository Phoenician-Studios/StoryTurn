export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createFamilyAction, joinFamilyAction } from "@/app/actions";
import { ToastForm } from "@/components/toast-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentMember, getCurrentUser } from "@/lib/demo/store";

export default function OnboardingPage() {
  const user = getCurrentUser();
  if (!user) redirect("/login");
  if (getCurrentMember()) redirect("/");

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
            <Input id="code" name="code" placeholder="RIVERA24" required />
          </div>
          <Button type="submit" variant="secondary">
            Join family
          </Button>
        </ToastForm>
      </div>
    </main>
  );
}

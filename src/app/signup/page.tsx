import { BackLink } from "@/components/back-link";
export const dynamic = "force-dynamic";
import Link from "next/link";
import { signupAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDemoMode } from "@/lib/config";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const demo = isDemoMode();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <BackLink href="/login" label="Back to sign in" />
      <div className="story-panel animate-rise rounded-2xl p-6">
        <p className="font-display text-3xl text-primary">StoryTurn</p>
        <h1 className="mt-2 text-xl font-medium">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {demo
            ? "In demo mode, signing up creates a local reader profile."
            : "Use email and password. You can also sign in with Google from the login page."}
        </p>
        {params.error && <p className="mt-3 text-sm text-destructive">{params.error}</p>}
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
              required={!demo}
              minLength={demo ? undefined : 6}
            />
          </div>
          <Button type="submit" className="w-full">
            Sign up
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

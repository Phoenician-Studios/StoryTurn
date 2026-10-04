export const dynamic = "force-dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="story-panel animate-rise rounded-2xl p-6">
        <p className="font-display text-3xl text-primary">StoryTurn</p>
        <h1 className="mt-2 text-xl font-medium">Reset password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          With Supabase configured, this sends a recovery email. In demo mode it
          confirms the flow without sending mail.
        </p>
        <form className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <Button type="submit" className="w-full">
            Send reset link
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

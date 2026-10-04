export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { googleLoginAction, loginAction, switchDemoUserAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDemoMode } from "@/lib/config";
import { getCurrentUser } from "@/lib/data";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  const params = await searchParams;
  const demo = isDemoMode();

  return (
    <main className="relative mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%231f6f5b\' fill-opacity=\'0.06\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
      <div className="animate-rise grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <section className="space-y-5">
          <p className="font-display text-5xl leading-none text-primary md:text-6xl">
            StoryTurn
          </p>
          <h1 className="max-w-xl text-2xl font-medium tracking-tight text-foreground md:text-3xl">
            Never wonder whose night it is again.
          </h1>
          <p className="max-w-lg text-base text-muted-foreground">
            Track the bedtime rotation, keep a family library, and send calendar
            invites for every reading night — parents, grandparents, and anyone
            who joins with an invite code.
          </p>
        </section>

        <section className="story-panel animate-rise-delay rounded-2xl p-6">
          <h2 className="font-display text-2xl text-foreground">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {demo
              ? "Demo mode is on. Use a sample account or any email."
              : "Use your email and password, or continue with Google."}
          </p>
          {params.error && (
            <p className="mt-3 text-sm text-destructive">{params.error}</p>
          )}
          {params.notice && (
            <p className="mt-3 text-sm text-muted-foreground">{params.notice}</p>
          )}
          <form action={loginAction} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="alex@example.com"
                defaultValue={demo ? "alex@example.com" : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required={!demo}
                placeholder={demo ? "demo" : ""}
                defaultValue={demo ? "demo" : undefined}
              />
            </div>
            <Button type="submit" className="w-full animate-glow">
              Continue
            </Button>
          </form>

          {!demo && (
            <form action={googleLoginAction} className="mt-3">
              <Button type="submit" variant="secondary" className="w-full">
                Continue with Google
              </Button>
            </form>
          )}

          {demo && (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Quick demo users
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ["alex@example.com", "Alex"],
                  ["jordan@example.com", "Jordan"],
                  ["nana@example.com", "Nana"],
                ].map(([email, label]) => (
                  <form key={email} action={switchDemoUserAction}>
                    <input type="hidden" name="email" value={email} />
                    <Button type="submit" variant="secondary" size="sm">
                      {label}
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          )}

          <p className="mt-6 text-sm text-muted-foreground">
            <Link href="/reset-password" className="text-primary underline-offset-2 hover:underline">
              Forgot password
            </Link>
            {" · "}
            <Link href="/signup" className="text-primary underline-offset-2 hover:underline">
              Create account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

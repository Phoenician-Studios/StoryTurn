export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { addKidAction, createInviteAction } from "@/app/actions";
import { CopyInviteLink } from "@/components/copy-invite-link";
import { AppNav } from "@/components/app-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentMember, getCurrentUser, getFamilyAdmin } from "@/lib/data";

export default async function FamilyPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");
  const admin = await getFamilyAdmin();
  if (!admin) redirect("/onboarding");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav displayName={member.displayName} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <section className="animate-rise">
          <h1 className="font-display text-3xl text-primary">{admin.family.name}</h1>
          <p className="mt-1 text-muted-foreground">
            Manage kids, readers, and invite codes for grandparents or other caregivers.
          </p>
        </section>

        {invite === "already-member" && (
          <p
            role="status"
            className="mt-4 rounded-lg border border-border bg-secondary/50 p-3 text-sm"
          >
            You already belong to a family. This account cannot join another family with
            an invite. To use the invite with a different account, sign out and reopen the
            link.
          </p>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section className="story-panel rounded-2xl p-5 animate-rise-delay">
            <h2 className="font-display text-xl">Readers</h2>
            <ul className="mt-4 space-y-2">
              {admin.readers.map((reader) => (
                <li
                  key={reader.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{reader.displayName}</p>
                    <p className="text-sm text-muted-foreground">{reader.email}</p>
                  </div>
                  <Badge variant="outline">{reader.role}</Badge>
                </li>
              ))}
            </ul>
          </section>

          <section className="story-panel rounded-2xl p-5">
            <h2 className="font-display text-xl">Kids</h2>
            <ul className="mt-4 space-y-2">
              {admin.kids.map((kid) => (
                <li
                  key={kid.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2"
                >
                  <span className="font-medium">{kid.name}</span>
                  <span className="text-sm text-muted-foreground">Age {kid.age}</span>
                </li>
              ))}
            </ul>
            {member.role === "owner" ? (
              <form
                action={addKidAction}
                className="mt-4 grid gap-3 sm:grid-cols-[1fr_5rem_auto]"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" name="age" type="number" min={0} max={18} required />
                </div>
                <div className="flex items-end">
                  <Button type="submit">Add</Button>
                </div>
              </form>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Family owners can add kids.
              </p>
            )}
          </section>
        </div>

        <section className="story-panel mt-6 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl">Invite codes</h2>
              <p className="text-sm text-muted-foreground">
                Share a code so another adult can join as a reader.
              </p>
            </div>
            {member.role === "owner" && (
              <form action={createInviteAction}>
                <Button type="submit" variant="secondary">
                  Generate code
                </Button>
              </form>
            )}
          </div>
          <ul className="mt-4 space-y-2">
            {admin.invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <code className="font-mono text-sm tracking-wider">{invite.code}</code>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {invite.uses}
                    {invite.maxUses !== null ? ` / ${invite.maxUses}` : ""} uses
                  </span>
                  <CopyInviteLink code={invite.code} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

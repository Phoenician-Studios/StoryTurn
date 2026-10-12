import { BackLink } from "@/components/back-link";
import { FormSelect } from "@/components/form-select";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import {
  addKidAction,
  createInviteAction,
  updateMemberAction,
  updateKidAction,
  deleteKidAction,
} from "@/app/actions";
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
        <BackLink />
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

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
          <section className="story-panel rounded-2xl p-5 animate-rise-delay">
            <h2 className="font-display text-xl">Readers</h2>
            <ul className="mt-4 space-y-2">
              {admin.readers.map((reader) => (
                <li
                  key={reader.id}
                  className="flex min-w-0 flex-col gap-4 rounded-xl bg-secondary/50 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{reader.displayName}</p>
                    <p className="break-all text-sm text-muted-foreground">
                      {reader.email}
                    </p>
                  </div>
                  {member.role === "owner" ? (
                    <form
                      action={updateMemberAction}
                      className="grid w-full min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]"
                    >
                      <input type="hidden" name="id" value={reader.id} />
                      <label className="min-w-0 space-y-2 text-sm">
                        Name
                        <Input
                          name="name"
                          aria-label={`Name for ${reader.displayName}`}
                          defaultValue={reader.displayName}
                          required
                          className="text-base sm:text-sm"
                        />
                      </label>
                      {reader.id === member.id ? (
                        <div className="text-sm">
                          <span>Access</span>
                          <p className="flex h-8 items-center text-muted-foreground">
                            Parent (you)
                          </p>
                          <input type="hidden" name="role" value={reader.role} />
                        </div>
                      ) : (
                        <label className="min-w-0 space-y-2 text-sm">
                          Access
                          <FormSelect
                            name="role"
                            aria-label={`Access for ${reader.displayName}`}
                            defaultValue={reader.role}
                            options={[
                              { value: "owner", label: "Parent (can manage family)" },
                              { value: "reader", label: "Reader" },
                            ]}
                          />
                        </label>
                      )}
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full self-end sm:w-auto"
                      >
                        Save reader
                      </Button>
                    </form>
                  ) : (
                    <Badge variant="outline">
                      {reader.role === "owner" ? "Parent" : "Reader"}
                    </Badge>
                  )}
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
                  {member.role === "owner" ? (
                    <form
                      action={updateKidAction}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="id" value={kid.id} />
                      <label className="text-sm">
                        Name
                        <Input
                          name="name"
                          aria-label={`Name for ${kid.name}`}
                          defaultValue={kid.name}
                          required
                        />
                      </label>
                      <label className="text-sm">
                        Age
                        <Input
                          name="age"
                          aria-label={`Age for ${kid.name}`}
                          type="number"
                          min={0}
                          max={18}
                          defaultValue={kid.age}
                          required
                          className="w-20"
                        />
                      </label>
                      <Button type="submit" variant="outline">
                        Save child
                      </Button>
                      <Button
                        type="submit"
                        formAction={deleteKidAction}
                        formNoValidate
                        variant="destructive"
                      >
                        Remove child
                      </Button>
                    </form>
                  ) : (
                    <span>
                      {kid.name} · Age {kid.age}
                    </span>
                  )}
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
                Share a code so another parent or caregiver can join. Parents can manage
                the family and schedule.
              </p>
            </div>
            {member.role === "owner" && (
              <form
                action={createInviteAction}
                className="flex flex-wrap items-end gap-2"
              >
                <label className="text-sm">
                  Invite as
                  <FormSelect
                    name="role"
                    defaultValue="reader"
                    aria-label="Invite as"
                    options={[
                      { value: "reader", label: "Reader" },
                      { value: "owner", label: "Parent (can manage family)" },
                    ]}
                  />
                </label>
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
                    {invite.role === "owner" ? "Parent" : "Reader"} · {invite.uses}
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

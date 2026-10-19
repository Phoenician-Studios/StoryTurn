import { BackLink } from "@/components/back-link";
import { FormSelect } from "@/components/form-select";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import {
  addKidAction,
  updateMemberAction,
  updateKidAction,
  deleteKidAction,
  updateMemberRelationAction,
} from "@/app/actions";
import { AppNav } from "@/components/app-nav";
import { CopyInviteLinkButton } from "@/components/copy-invite-link-button";
import { CreateInviteForm } from "@/components/create-invite-form";
import { RelationSelect } from "@/components/relation-select";
import { ToastForm } from "@/components/toast-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentMember, getCurrentUser, getFamilyAdmin } from "@/lib/data";
import { ageFromBirthday, formatBirthdayLabel } from "@/lib/domain/kids";
import { childRelationLabel } from "@/lib/domain/relations";
import { invitePath } from "@/lib/domain/invites";
import { appUrl } from "@/lib/config";

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
  const isOwner = member.role === "owner";

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
            <ul className="mt-4 space-y-3">
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
                    <p className="mt-1 text-sm text-muted-foreground">
                      {childRelationLabel(reader.relationToChildren)} to the kids
                    </p>
                  </div>
                  {isOwner ? (
                    <>
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
                      <ToastForm
                        action={updateMemberRelationAction}
                        successMessage="Relation updated"
                        className="flex flex-wrap items-end gap-2"
                      >
                        <input type="hidden" name="memberId" value={reader.id} />
                        <div className="min-w-[10rem] flex-1">
                          <RelationSelect
                            id={`relation-${reader.id}`}
                            defaultValue={reader.relationToChildren}
                            label="Relation"
                          />
                        </div>
                        <Button type="submit" size="sm" variant="secondary">
                          Save relation
                        </Button>
                      </ToastForm>
                    </>
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
                  {isOwner ? (
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
                        Birthday
                        <Input
                          name="birthday"
                          aria-label={`Birthday for ${kid.name}`}
                          type="date"
                          defaultValue={kid.birthday}
                          required
                          className="w-36"
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
                      {kid.name} · {formatBirthdayLabel(kid.birthday)} ·{" "}
                      {ageFromBirthday(kid.birthday)} yrs
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {isOwner ? (
              <ToastForm
                action={addKidAction}
                successMessage="Kid added"
                className="mt-4 grid gap-3 sm:grid-cols-[1fr_10rem_auto]"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input id="birthday" name="birthday" type="date" required />
                </div>
                <div className="flex items-end">
                  <Button type="submit">Add</Button>
                </div>
              </ToastForm>
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
                Share an invite link so another parent or caregiver can join. New readers
                can skip re-entering the code after sign up.
              </p>
            </div>
            {isOwner && <CreateInviteForm />}
          </div>
          <ul className="mt-4 space-y-2">
            {admin.invites.map((inviteRow) => {
              const path = invitePath(inviteRow.code);
              const href = `${appUrl()}${path}`;
              return (
                <li
                  key={inviteRow.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0 space-y-1">
                    <code className="font-mono text-sm tracking-wider">
                      {inviteRow.code}
                    </code>
                    <p className="truncate text-xs text-muted-foreground">{href}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {inviteRow.role === "owner" ? "Parent" : "Reader"} ·{" "}
                      {inviteRow.uses}
                      {inviteRow.maxUses !== null ? ` / ${inviteRow.maxUses}` : ""} uses
                    </span>
                    <CopyInviteLinkButton code={inviteRow.code} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}

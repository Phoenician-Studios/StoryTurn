export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { addKidAction, updateMemberRelationAction } from "@/app/actions";
import { AppNav } from "@/components/app-nav";
import { CopyInviteLinkButton } from "@/components/copy-invite-link-button";
import { CreateInviteForm } from "@/components/create-invite-form";
import { RelationSelect } from "@/components/relation-select";
import { ToastForm } from "@/components/toast-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getCurrentMember,
  getCurrentUser,
  getFamilyAdmin,
} from "@/lib/demo/store";
import {
  ageFromBirthday,
  formatBirthdayLabel,
} from "@/lib/domain/kids";
import { childRelationLabel } from "@/lib/domain/relations";
import { invitePath } from "@/lib/domain/invites";
import { appUrl } from "@/lib/config";

export default function FamilyPage() {
  const user = getCurrentUser();
  if (!user) redirect("/login");
  const member = getCurrentMember();
  if (!member) redirect("/onboarding");
  const admin = getFamilyAdmin();
  if (!admin) redirect("/onboarding");
  const isOwner = member.role === "owner";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav displayName={member.displayName} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <section className="animate-rise">
          <h1 className="font-display text-3xl text-primary">{admin.family.name}</h1>
          <p className="mt-1 text-muted-foreground">
            Manage kids, readers, and invite codes for grandparents or other
            caregivers.
          </p>
        </section>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section className="story-panel rounded-2xl p-5 animate-rise-delay">
            <h2 className="font-display text-xl">Readers</h2>
            <ul className="mt-4 space-y-3">
              {admin.readers.map((reader) => (
                <li
                  key={reader.id}
                  className="rounded-lg bg-secondary/50 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{reader.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {reader.email}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {childRelationLabel(reader.relationToChildren)} to the
                        kids
                      </p>
                    </div>
                    <Badge variant="outline">{reader.role}</Badge>
                  </div>
                  {isOwner && (
                    <ToastForm
                      action={updateMemberRelationAction}
                      successMessage="Relation updated"
                      className="mt-3 flex flex-wrap items-end gap-2"
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
                        Save
                      </Button>
                    </ToastForm>
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
                  <span className="font-medium">{kid.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatBirthdayLabel(kid.birthday)}
                    {" · "}
                    {ageFromBirthday(kid.birthday)} yrs
                  </span>
                </li>
              ))}
            </ul>
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
          </section>
        </div>

        <section className="story-panel mt-6 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl">Invite codes</h2>
              <p className="text-sm text-muted-foreground">
                Share an invite link. New readers join the family right after
                sign up.
              </p>
            </div>
            <CreateInviteForm />
          </div>
          <ul className="mt-4 space-y-2">
            {admin.invites.map((invite) => {
              const path = invitePath(invite.code);
              const href = `${appUrl()}${path}`;
              return (
                <li
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0 space-y-1">
                    <code className="font-mono text-sm tracking-wider">
                      {invite.code}
                    </code>
                    <p className="truncate text-xs text-muted-foreground">
                      {href}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {invite.uses}
                      {invite.maxUses !== null ? ` / ${invite.maxUses}` : ""}{" "}
                      uses
                    </span>
                    <CopyInviteLinkButton code={invite.code} />
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

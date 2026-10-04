export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { saveScheduleAction, deleteScheduleAction } from "@/app/actions";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimezonePicker } from "@/components/timezone-picker";
import {
  getCurrentMember,
  getCurrentUser,
  getFamilyAdmin,
  listFamilyAssignments,
  listFamilySessions,
} from "@/lib/data";
import { sessionDateKey } from "@/lib/domain/sessions";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function SchedulePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");
  const admin = await getFamilyAdmin();
  if (!admin) redirect("/onboarding");
  const sessions = (await listFamilySessions()).slice(0, 12);
  const names = Object.fromEntries(admin.readers.map((r) => [r.id, r.displayName]));
  const assignments = await listFamilyAssignments();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav displayName={member.displayName} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <section className="animate-rise">
          <h1 className="font-display text-3xl text-primary">Reading schedule</h1>
          <p className="mt-1 text-muted-foreground">
            Rotate readers for nights with both kids together. Future nights get ICS
            invites automatically.
          </p>
        </section>

        {member.role === "owner" ? (
          <form
            action={saveScheduleAction}
            className="story-panel mt-6 space-y-4 rounded-2xl p-5 animate-rise-delay"
          >
            <h2 className="font-display text-xl">
              {admin.schedule ? "Edit rotation" : "Create rotation"}
            </h2>
            <div className="flex flex-wrap gap-3">
              {admin.readers.map((reader) => (
                <label
                  key={reader.id}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="readers"
                    value={reader.id}
                    defaultChecked={
                      admin.schedule
                        ? admin.schedule.readerRotationMemberIds.includes(reader.id)
                        : true
                    }
                  />
                  {reader.displayName}
                </label>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  defaultValue={admin.schedule?.startDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeLocal">Bedtime</Label>
                <Input
                  id="timeLocal"
                  name="timeLocal"
                  type="time"
                  required
                  defaultValue={admin.schedule?.timeLocal ?? "19:30"}
                />
              </div>
              <TimezonePicker defaultValue={admin.schedule?.timezone} />
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Choose books before reading, log them afterward, or do both. You can
                update each night’s book list at any time.
              </p>
            </div>
            <Button type="submit">Save schedule & generate nights</Button>
          </form>
        ) : (
          <p className="story-panel mt-6 rounded-2xl p-5 text-sm text-muted-foreground">
            Family owners manage the rotation. Your upcoming nights are listed below.
          </p>
        )}

        {member.role === "owner" && admin.schedule && (
          <form action={deleteScheduleAction} className="mt-4">
            <p className="mb-2 text-sm text-muted-foreground">
              Deleting the schedule cancels its upcoming nights and keeps reading history.
            </p>
            <Button type="submit" variant="destructive">
              Delete schedule
            </Button>
          </form>
        )}
        <section className="mt-8">
          <h2 className="font-display text-xl">Upcoming & recent</h2>
          <ul className="mt-4 space-y-2">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/sessions/${session.id}`}
                  className="story-panel flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 transition hover:border-primary/40"
                >
                  <span>
                    {sessionDateKey(session.scheduledFor)} ·{" "}
                    {session.scheduledFor.slice(11, 16)}
                  </span>
                  <Badge variant="outline">{session.status}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {assignments
                      .filter((a) => a.sessionId === session.id && a.isCurrent)
                      .map((a) => names[a.memberId] ?? "Reader")
                      .join(", ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

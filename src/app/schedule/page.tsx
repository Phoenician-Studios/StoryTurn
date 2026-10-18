export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { saveScheduleAction } from "@/app/actions";
import { AppNav } from "@/components/app-nav";
import { ToastForm } from "@/components/toast-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getCurrentMember,
  getCurrentUser,
  getDemoState,
  getFamilyAdmin,
  listFamilySessions,
} from "@/lib/demo/store";
import { sessionDateKey } from "@/lib/domain/sessions";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function SchedulePage() {
  const user = getCurrentUser();
  if (!user) redirect("/login");
  const member = getCurrentMember();
  if (!member) redirect("/onboarding");
  const admin = getFamilyAdmin();
  if (!admin) redirect("/onboarding");
  const sessions = listFamilySessions().slice(0, 12);
  const names = Object.fromEntries(
    admin.readers.map((r) => [r.id, r.displayName]),
  );
  const assignments = getDemoState().assignments;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav displayName={member.displayName} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <section className="animate-rise">
          <h1 className="font-display text-3xl text-primary">Reading schedule</h1>
          <p className="mt-1 text-muted-foreground">
            Rotate readers for nights with both kids together. Future nights get
            ICS invites automatically.
          </p>
        </section>

        <ToastForm
          action={saveScheduleAction}
          successMessage="Schedule saved and nights generated"
          className="story-panel mt-6 space-y-4 rounded-2xl p-5 animate-rise-delay"
        >
          <h2 className="font-display text-xl">Rotation</h2>
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
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                name="timezone"
                defaultValue={admin.schedule?.timezone ?? "America/Los_Angeles"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookTiming">Book selection</Label>
              <select
                id="bookTiming"
                name="bookTiming"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                defaultValue={admin.schedule?.bookTiming ?? "after"}
              >
                <option value="after">Log books after reading</option>
                <option value="ahead">Select books ahead of time</option>
              </select>
            </div>
          </div>
          <Button type="submit">Save schedule & generate nights</Button>
        </ToastForm>

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

export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import {
  cascadeInsertAction,
  saveScheduleAction,
  swapSessionsAction,
} from "@/app/actions";
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
import {
  DEFAULT_FAMILY_TIMEZONE,
  formatDateOnlyInTimeZone,
  formatRelativeDay,
  formatRelativeSessionWhen,
} from "@/lib/domain/dates";
import { childRelationLabel } from "@/lib/domain/relations";
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
  const names = Object.fromEntries(
    admin.readers.map((r) => [r.id, r.displayName]),
  );
  const assignments = getDemoState().assignments;
  const isOwner = member.role === "owner";
  const timeZone = admin.schedule?.timezone ?? DEFAULT_FAMILY_TIMEZONE;
  const today = formatDateOnlyInTimeZone(new Date(), timeZone);
  const allSessions = listFamilySessions();
  // Ascending list: start a couple nights before today so "recent" still appears,
  // then take the next 12 chronologically.
  const listStart = Math.max(
    0,
    allSessions.findIndex(
      (s) => sessionDateKey(s.scheduledFor) >= today,
    ) - 2,
  );
  const sessions = allSessions.slice(listStart, listStart + 12);
  const futureScheduled = allSessions.filter(
    (s) =>
      s.status === "scheduled" && sessionDateKey(s.scheduledFor) >= today,
  );

  const readerLabel = (sessionId: string) =>
    assignments
      .filter((a) => a.sessionId === sessionId && a.isCurrent)
      .map((a) => names[a.memberId] ?? "Reader")
      .join(", ");

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
                <span>
                  {reader.displayName}
                  <span className="ml-1 text-muted-foreground">
                    ({childRelationLabel(reader.relationToChildren)})
                  </span>
                </span>
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

        {isOwner && futureScheduled.length > 0 && (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <ToastForm
              action={cascadeInsertAction}
              successMessage="Rotation cascaded forward"
              className="story-panel space-y-4 rounded-2xl p-5"
            >
              <div>
                <h2 className="font-display text-xl">Cascade a fill-in</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Put someone on a night (like a grandparent covering tonight)
                  and shift everyone after them forward one day.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromSessionId">Starting night</Label>
                <select
                  id="fromSessionId"
                  name="fromSessionId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  required
                  defaultValue={futureScheduled[0]?.id}
                >
                  {futureScheduled.map((session) => (
                    <option key={session.id} value={session.id}>
                      {formatRelativeDay(session.scheduledFor, today, timeZone)}{" "}
                      · {readerLabel(session.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fillInMemberId">Fill-in reader</Label>
                <select
                  id="fillInMemberId"
                  name="fillInMemberId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  required
                  defaultValue={
                    admin.readers.find((r) => r.relationToChildren === "grandparent")
                      ?.id ?? admin.readers[0]?.id
                  }
                >
                  {admin.readers.map((reader) => (
                    <option key={reader.id} value={reader.id}>
                      {reader.displayName} (
                      {childRelationLabel(reader.relationToChildren)})
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">Cascade forward</Button>
            </ToastForm>

            <ToastForm
              action={swapSessionsAction}
              successMessage="Nights swapped"
              className="story-panel space-y-4 rounded-2xl p-5"
            >
              <div>
                <h2 className="font-display text-xl">Swap two nights</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Exchange readers between two nights without shifting the rest
                  of the rotation.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionAId">First night</Label>
                <select
                  id="sessionAId"
                  name="sessionAId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  required
                  defaultValue={futureScheduled[0]?.id}
                >
                  {futureScheduled.map((session) => (
                    <option key={session.id} value={session.id}>
                      {formatRelativeDay(session.scheduledFor, today, timeZone)}{" "}
                      · {readerLabel(session.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionBId">Second night</Label>
                <select
                  id="sessionBId"
                  name="sessionBId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  required
                  defaultValue={futureScheduled[1]?.id ?? futureScheduled[0]?.id}
                >
                  {futureScheduled.map((session) => (
                    <option key={session.id} value={session.id}>
                      {formatRelativeDay(session.scheduledFor, today, timeZone)}{" "}
                      · {readerLabel(session.id)}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" variant="secondary">
                Swap readers
              </Button>
            </ToastForm>
          </div>
        )}

        <section className="mt-8">
          <h2 className="font-display text-xl">Upcoming & recent</h2>
          <ul className="mt-4 space-y-2">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/sessions/${session.id}`}
                  className="story-panel grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 rounded-xl px-4 py-3 transition hover:border-primary/40"
                >
                  <span className="min-w-0 truncate">
                    {formatRelativeSessionWhen(session.scheduledFor, {
                      today,
                      timeZone,
                    })}
                  </span>
                  <Badge variant="outline" className="justify-self-center">
                    {session.status}
                  </Badge>
                  <span className="min-w-0 truncate text-right text-sm text-muted-foreground">
                    {readerLabel(session.id)}
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

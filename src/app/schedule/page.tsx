import Form from "next/form";
import { NativeSelect } from "@/components/ui/native-select";
import { sessionStatusFilter } from "@/lib/domain/session-presentation";
import { BackLink } from "@/components/back-link";
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { saveScheduleAction, deleteScheduleAction } from "@/app/actions";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeTimezoneForm } from "@/components/native-timezone-form";
import {
  getCurrentMember,
  getCurrentUser,
  getFamilyAdmin,
  getFamilySessionPage,
} from "@/lib/data";
import { formatSessionDate, sessionPageNumbers } from "@/lib/domain/session-presentation";
import Link from "next/link";
import { SessionStatusBadge } from "@/components/session-status";
import { buttonVariants } from "@/components/ui/button";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; status?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");
  const admin = await getFamilyAdmin();
  if (!admin) redirect("/onboarding");
  const { page: requestedPage, status: requestedStatus } = await searchParams;
  const status = sessionStatusFilter(requestedStatus);
  const pagination = await getFamilySessionPage(requestedPage, status);
  const assignments = pagination.assignments;
  const sessions = pagination.items;
  const names = Object.fromEntries(admin.readers.map((r) => [r.id, r.displayName]));

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav displayName={member.displayName} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <BackLink />
        <section className="animate-rise">
          <h1 className="font-display text-3xl text-primary">Reading schedule</h1>
          <p className="mt-1 text-muted-foreground">
            Rotate readers for nights with both kids together. Future nights get ICS
            invites automatically.
          </p>
        </section>

        {member.role === "owner" ? (
          <NativeTimezoneForm action={saveScheduleAction}>
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
              <div className="space-y-2">
                <Label htmlFor="booksPerSession">Books per session</Label>
                <Input
                  id="booksPerSession"
                  name="booksPerSession"
                  type="number"
                  min={1}
                  step={1}
                  required
                  defaultValue={admin.schedule?.booksPerSession ?? 1}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="assignRandomBooks"
                  defaultChecked={admin.schedule?.assignRandomBooks ?? false}
                />
                Assign random books from the family library each night
              </label>
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Random assignments apply to new nights. If your library has fewer books,
                we use the available books. Existing selections stay as they are.
              </p>
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Choose books before reading, log them afterward, or do both. You can
                update each night’s book list at any time.
              </p>
            </div>
            <Button type="submit">Save schedule & generate nights</Button>
          </NativeTimezoneForm>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl">Upcoming & recent</h2>
            <Form action="/schedule" scroll={false} className="flex items-center gap-2">
              <Label htmlFor="session-status">Status</Label>
              <div className="w-40">
                <NativeSelect
                  key={status ?? "all"}
                  id="session-status"
                  name="status"
                  defaultValue={status ?? "all"}
                >
                  <option value="all">All statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </NativeSelect>
              </div>
              <Button type="submit" variant="outline" size="sm">
                Apply
              </Button>
            </Form>
          </div>
          <ul className="mt-4 space-y-2">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/sessions/${session.id}`}
                  className="story-panel grid grid-cols-[minmax(0,1fr)_6rem] items-center gap-x-3 gap-y-1 rounded-xl px-4 py-3 transition hover:border-primary/40 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)]"
                >
                  <span>
                    {formatSessionDate(session.scheduledFor)} ·{" "}
                    {session.scheduledFor.slice(11, 16)}
                  </span>
                  <SessionStatusBadge
                    status={session.status}
                    className="col-start-2 row-start-1 justify-self-center"
                  />
                  <span className="col-start-1 row-start-2 min-w-0 break-words text-sm text-muted-foreground sm:col-start-3 sm:row-start-1 sm:text-right">
                    {assignments
                      .filter((a) => a.sessionId === session.id && a.isCurrent)
                      .map((a) => names[a.memberId] ?? "Reader")
                      .join(", ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {pagination.total === 0 ? (
            <p className="mt-4 text-muted-foreground">
              {status ? `No ${status} sessions.` : "No reading sessions yet."}
            </p>
          ) : (
            <nav
              aria-label="Session pages"
              className="mt-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex flex-wrap gap-2">
                {sessionPageNumbers(pagination.page, pagination.pageCount).map(
                  (page, index) =>
                    page === "ellipsis" ? (
                      <span key={`gap-${index}`} className="px-2 py-2" aria-hidden="true">
                        …
                      </span>
                    ) : (
                      <Link
                        key={page}
                        href={`/schedule?page=${page}${status ? `&status=${status}` : ""}`}
                        aria-label={`Page ${page}`}
                        aria-current={page === pagination.page ? "page" : undefined}
                        className={buttonVariants({
                          variant: page === pagination.page ? "default" : "outline",
                          size: "sm",
                        })}
                      >
                        {page}
                      </Link>
                    ),
                )}
              </div>
              <span className="text-sm" aria-live="polite">
                Page {pagination.page} of {pagination.pageCount} · {pagination.total}{" "}
                sessions
              </span>
            </nav>
          )}
        </section>
      </main>
    </div>
  );
}

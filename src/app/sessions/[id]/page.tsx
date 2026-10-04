export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import {
  cancelSessionAction,
  updateSessionAction,
} from "@/app/actions";
import { AppNav } from "@/components/app-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  currentReaderLabels,
  originalReaderLabels,
  wasCorrected,
} from "@/lib/domain/corrections";
import { isPastSession, sessionDateKey } from "@/lib/domain/sessions";
import {
  getCurrentMember,
  getCurrentUser,
  getSessionDetail,
} from "@/lib/data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const { id } = await params;
  const detail = await getSessionDetail(id);
  if (!detail) redirect("/");

  const corrected = wasCorrected({
    assignments: detail.assignments,
    corrections: detail.corrections,
    sessionId: id,
  });
  const past = isPastSession(detail.session.scheduledFor);
  const currentIds = new Set(
    detail.assignments.filter((a) => a.isCurrent).map((a) => a.memberId),
  );
  const selectedBookIds = new Set(
    detail.books.map((b) => b.bookId).filter(Boolean) as string[],
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav displayName={member.displayName} />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <section className="animate-rise">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{detail.session.status}</Badge>
            {corrected && <Badge className="bg-accent text-accent-foreground">Corrected</Badge>}
          </div>
          <h1 className="font-display mt-3 text-3xl text-primary">
            {sessionDateKey(detail.session.scheduledFor)} ·{" "}
            {detail.session.scheduledFor.slice(11, 16)}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Current reader:{" "}
            {currentReaderLabels({
              assignments: detail.assignments,
              memberNames: detail.memberNames,
              sessionId: id,
            }).join(", ")}
          </p>
          {corrected && (
            <Alert className="mt-4">
              <AlertTitle>Original assignment preserved</AlertTitle>
              <AlertDescription>
                Originally assigned to{" "}
                {originalReaderLabels({
                  assignments: detail.assignments,
                  memberNames: detail.memberNames,
                  sessionId: id,
                }).join(", ")}
                . Corrections do not erase who was first on the schedule.
              </AlertDescription>
            </Alert>
          )}
        </section>

        {detail.corrections.length > 0 && (
          <section className="mt-6 space-y-3">
            <h2 className="font-display text-xl">Correction history</h2>
            {detail.corrections.map((c) => (
              <div key={c.id} className="story-panel rounded-xl p-4 text-sm">
                <p className="font-medium">{c.reason}</p>
                <p className="mt-1 text-muted-foreground">
                  {new Date(c.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </section>
        )}

        <form
          action={updateSessionAction}
          className="story-panel mt-6 space-y-4 rounded-2xl p-5 animate-rise-delay"
        >
          <input type="hidden" name="sessionId" value={id} />
          <h2 className="font-display text-xl">
            {past ? "Correct this night" : "Edit this night"}
          </h2>

          <div className="space-y-2">
            <Label>Assigned readers</Label>
            <div className="flex flex-wrap gap-3">
              {detail.readers.map((reader) => (
                <label
                  key={reader.id}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="memberIds"
                    value={reader.id}
                    defaultChecked={currentIds.has(reader.id)}
                  />
                  {reader.displayName}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Books from library</Label>
            <div className="flex flex-wrap gap-3">
              {detail.library.map((book) => (
                <label
                  key={book.id}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="bookIds"
                    value={book.id}
                    defaultChecked={selectedBookIds.has(book.id)}
                  />
                  {book.title}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="freeformTitles">Other book titles (one per line)</Label>
            <Textarea
              id="freeformTitles"
              name="freeformTitles"
              defaultValue={detail.books
                .filter((b) => b.titleFreeform)
                .map((b) => b.titleFreeform)
                .join("\n")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={detail.session.notes ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue={detail.session.status}
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {(past || detail.session.status === "completed") && (
            <div className="space-y-2">
              <Label htmlFor="reason">Correction reason</Label>
              <Textarea
                id="reason"
                name="reason"
                placeholder="Why are you changing the past record?"
                required={past}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit">Save changes</Button>
          </div>
        </form>

        {detail.session.status !== "cancelled" && (
          <form
            action={async () => {
              "use server";
              await cancelSessionAction(id);
            }}
            className="mt-4"
          >
            <Button type="submit" variant="destructive">
              Cancel this reading session
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}

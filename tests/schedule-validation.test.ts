import { expect, it } from "vitest";
import { resetDemoStore, saveSchedule, getDemoState } from "@/lib/demo/store";
it("rejects invalid timezone, dates, and times before changing a schedule", () => {
  resetDemoStore();
  const schedule = { ...getDemoState().schedules[0] };
  for (const override of [
    { timezone: "not-a-zone" },
    { startDate: "2026-02-30" },
    { timeLocal: "25:00" },
    { booksPerSession: 0 },
    { booksPerSession: 1.5 },
    { booksPerSession: NaN },
  ]) {
    expect(() => saveSchedule({ ...schedule, ...override })).toThrow();
    expect(getDemoState().schedules[0]).toEqual(schedule);
  }
});

it("assigns distinct family books to new nights up to the requested count", () => {
  resetDemoStore();
  const state = getDemoState();
  state.sessions = [];
  state.assignments = [];
  state.sessionBooks = [];
  const schedule = state.schedules[0]!;
  saveSchedule({
    ...schedule,
    startDate: "2026-01-01",
    booksPerSession: 2,
    assignRandomBooks: true,
  });
  expect(state.sessions.length).toBeGreaterThan(0);
  for (const session of state.sessions) {
    const selected = state.sessionBooks.filter((b) => b.sessionId === session.id);
    expect(selected).toHaveLength(
      Math.min(2, state.books.filter((b) => b.familyId === session.familyId).length),
    );
    expect(new Set(selected.map((b) => b.bookId)).size).toBe(selected.length);
    expect(
      selected.every((row) =>
        state.books.some(
          (book) => book.id === row.bookId && book.familyId === session.familyId,
        ),
      ),
    ).toBe(true);
  }
  const selections = [...state.sessionBooks];
  saveSchedule({ ...schedule, booksPerSession: 3, assignRandomBooks: true });
  expect(state.sessionBooks).toEqual(selections);
});

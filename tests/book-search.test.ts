// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BookSearch } from "@/components/book-search";
import { CopyInviteLink } from "@/components/copy-invite-link";
import { searchBooksAction } from "@/app/actions";

vi.mock("@/app/actions", () => ({ addBookAction: vi.fn(), searchBooksAction: vi.fn() }));
afterEach(cleanup);

it("requires a concrete edition before adding a work search result", async () => {
  vi.mocked(searchBooksAction).mockResolvedValue([
    {
      openLibraryKey: "/works/OL1W",
      title: "Book",
      authors: [],
      coverUrl: null,
      isbn: null,
      year: null,
    },
  ]);
  render(createElement(BookSearch, { collectionKeys: [] }));
  fireEvent.change(screen.getByRole("textbox", { name: "Search books" }), {
    target: { value: "book" },
  });
  await screen.findByRole("button", { name: "Choose edition" });
  expect(screen.queryByRole("button", { name: "Add to library" })).toBeNull();
});

it("copies a full invite URL and reports clipboard failures", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(createElement(CopyInviteLink, { code: "FAMILY24" }));
  fireEvent.click(screen.getByRole("button", { name: "Copy invite link" }));
  await screen.findByRole("button", { name: "Copied!" });
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/join?code=FAMILY24`);
  writeText.mockRejectedValue(new Error("Denied"));
  fireEvent.click(screen.getByRole("button", { name: "Copied!" }));
  await screen.findByText("Could not copy. Please try again.");
});

it("debounces typing and ignores stale responses after clearing the input", async () => {
  vi.useFakeTimers();
  vi.mocked(searchBooksAction).mockClear();
  let resolve!: (books: Awaited<ReturnType<typeof searchBooksAction>>) => void;
  vi.mocked(searchBooksAction).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  try {
    render(createElement(BookSearch, { collectionKeys: [] }));
    const input = screen.getByRole("textbox", { name: "Search books" });
    fireEvent.change(input, { target: { value: "cat" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    fireEvent.change(input, { target: { value: "cats" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(349);
    });
    expect(searchBooksAction).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(searchBooksAction).toHaveBeenCalledExactlyOnceWith("cats");
    expect(screen.getByRole("status").textContent).toBe("Searching…");
    fireEvent.change(input, { target: { value: "" } });
    await act(async () => {
      resolve([
        {
          openLibraryKey: "/works/stale",
          title: "Stale",
          authors: [],
          coverUrl: null,
          isbn: null,
          year: null,
        },
      ]);
    });
    expect(screen.queryByText("Stale")).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    expect(searchBooksAction).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});

it("skips short searches and displays errors after loading", async () => {
  vi.useFakeTimers();
  vi.mocked(searchBooksAction).mockClear();
  let reject!: (error: Error) => void;
  vi.mocked(searchBooksAction).mockImplementation(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  try {
    render(createElement(BookSearch, { collectionKeys: [] }));
    const input = screen.getByRole("textbox", { name: "Search books" });
    fireEvent.change(input, { target: { value: " a " } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    expect(searchBooksAction).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: " ab " } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    expect(searchBooksAction).toHaveBeenCalledExactlyOnceWith("ab");
    expect(screen.getByRole("status").textContent).toBe("Searching…");
    await act(async () => {
      reject(new Error("Search service unavailable"));
    });
    expect(screen.getByText("Search service unavailable")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

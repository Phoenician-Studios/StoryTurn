// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BookSearch } from "@/components/book-search";
import { CopyInviteLink } from "@/components/copy-invite-link";
import { addBookAction, searchBooksAction } from "@/app/actions";

vi.mock("@/app/actions", () => ({ addBookAction: vi.fn(), searchBooksAction: vi.fn() }));
afterEach(cleanup);

it("marks existing books and shows pending and success states when adding", async () => {
  vi.mocked(searchBooksAction).mockResolvedValue([
    {
      openLibraryKey: "/works/existing",
      title: "Existing",
      authors: [],
      coverUrl: null,
      isbn: null,
      year: null,
    },
    {
      openLibraryKey: "/works/new",
      title: "New",
      authors: [],
      coverUrl: null,
      isbn: null,
      year: null,
    },
  ]);
  let finish!: () => void;
  vi.mocked(addBookAction).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  render(createElement(BookSearch, { collectionKeys: ["/works/existing"] }));
  fireEvent.change(screen.getByRole("textbox", { name: "Search books" }), {
    target: { value: "story" },
  });
  await screen.findByRole("button", { name: "In collection" });
  expect(
    (screen.getByRole("button", { name: "In collection" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Add to library" }));
  const adding = await screen.findByRole("button", { name: "Adding…" });
  expect(adding.getAttribute("aria-busy")).toBe("true");
  await act(async () => finish());
  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: "In collection" })).toHaveLength(2),
  );
});

it("keeps failed additions available to retry", async () => {
  vi.mocked(searchBooksAction).mockResolvedValue([
    {
      openLibraryKey: "/works/new",
      title: "New",
      authors: [],
      coverUrl: null,
      isbn: null,
      year: null,
    },
  ]);
  vi.mocked(addBookAction).mockRejectedValue(new Error("Failure"));
  render(createElement(BookSearch, { collectionKeys: [] }));
  fireEvent.change(screen.getByRole("textbox", { name: "Search books" }), {
    target: { value: "story" },
  });
  fireEvent.click(await screen.findByRole("button", { name: "Add to library" }));
  await screen.findByText("Could not add book. Please try again.");
  expect(
    (screen.getByRole("button", { name: "Add to library" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
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

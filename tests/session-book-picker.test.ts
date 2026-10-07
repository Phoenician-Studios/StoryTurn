// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { SessionBookPicker } from "@/components/session-book-picker";
import { searchLibraryBooksAction } from "@/app/library-picker-actions";
vi.mock("@/app/library-picker-actions", () => ({ searchLibraryBooksAction: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("retains selections across server searches, pages, and closing the modal", async () => {
  vi.mocked(searchLibraryBooksAction).mockImplementation(async (query, page) => ({
    items: [
      {
        id: query ? "found" : page === 2 ? "second" : "first",
        title: query ? "Found story" : page === 2 ? "Second story" : "First story",
      },
    ],
    total: query ? 1 : 11,
    page: page ?? 1,
    pageCount: query ? 1 : 2,
  }));
  const user = userEvent.setup();
  const { container } = render(
    createElement(
      "form",
      null,
      createElement(SessionBookPicker, {
        books: [{ id: "planned", title: "Planned story" }],
        selectedIds: ["planned"],
      }),
    ),
  );
  await user.click(screen.getByRole("button", { name: "Add books from library" }));
  await user.click(
    await screen.findByRole("button", { name: "First story (Format unknown)" }),
  );
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.click(
    await screen.findByRole("button", { name: "Second story (Format unknown)" }),
  );
  await user.type(screen.getByRole("textbox", { name: "Search library books" }), "found");
  await user.click(
    await screen.findByRole("button", { name: "Found story (Format unknown)" }),
  );
  expect(searchLibraryBooksAction).toHaveBeenLastCalledWith("found", 1);
  await user.click(screen.getByRole("button", { name: /Done/ }));
  expect(new FormData(container.querySelector("form")!).getAll("bookIds")).toEqual([
    "planned",
    "first",
    "second",
    "found",
  ]);
  await user.click(screen.getByRole("button", { name: "Remove Planned story" }));
  expect(new FormData(container.querySelector("form")!).getAll("bookIds")).toEqual([
    "first",
    "second",
    "found",
  ]);
});

it("shows loading and failure states and lets the user retry", async () => {
  vi.mocked(searchLibraryBooksAction)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ items: [], page: 1, pageCount: 1, total: 0 });
  const user = userEvent.setup();
  render(createElement(SessionBookPicker, { books: [], selectedIds: [] }));
  await user.click(screen.getByRole("button", { name: "Add books from library" }));
  expect(screen.getByRole("status").textContent).toContain("Searching");
  await user.click(await screen.findByRole("button", { name: "Try again" }));
  await waitFor(() => expect(screen.getByText(/Your library is empty/)).toBeTruthy());
});

it("renders cover tiles with keyboard selection and handles unavailable covers", async () => {
  vi.mocked(searchLibraryBooksAction).mockResolvedValue({
    items: [
      {
        id: "cover",
        title: "Cover story",
        coverUrl: "https://covers.openlibrary.org/b/id/1-M.jpg",
      },
      { id: "no-cover", title: "No cover", coverUrl: null },
    ],
    page: 1,
    pageCount: 1,
    total: 2,
  });
  const user = userEvent.setup();
  render(createElement(SessionBookPicker, { books: [], selectedIds: [] }));
  await user.click(screen.getByRole("button", { name: "Add books from library" }));
  const tile = await screen.findByRole("button", {
    name: "Cover story (Format unknown)",
  });
  const image = tile.querySelector("img")!;
  expect(image.getAttribute("src")).toBe("https://covers.openlibrary.org/b/id/1-M.jpg");
  expect(tile.getAttribute("aria-pressed")).toBe("false");
  tile.focus();
  await user.keyboard("{Enter}");
  expect(tile.getAttribute("aria-pressed")).toBe("true");
  await user.keyboard(" ");
  expect(tile.getAttribute("aria-pressed")).toBe("false");
  fireEvent.error(image);
  expect(tile.querySelector("img")).toBeNull();
  expect(tile.querySelector("svg")).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: "No cover (Format unknown)" })
      .querySelector("svg"),
  ).toBeTruthy();
});

it("shows thumbnails for saved books and books selected in the modal", async () => {
  const savedCover = "https://covers.openlibrary.org/b/id/1-M.jpg";
  const addedCover = "https://covers.openlibrary.org/b/id/2-M.jpg";
  vi.mocked(searchLibraryBooksAction).mockResolvedValue({
    items: [{ id: "added", title: "Added story", coverUrl: addedCover }],
    page: 1,
    pageCount: 1,
    total: 1,
  });
  const user = userEvent.setup();
  render(
    createElement(SessionBookPicker, {
      books: [{ id: "saved", title: "Saved story", coverUrl: savedCover }],
      selectedIds: ["saved"],
    }),
  );
  expect(
    screen
      .getByRole("list", { name: "Selected books" })
      .querySelector("img")
      ?.getAttribute("src"),
  ).toBe(savedCover);
  await user.click(screen.getByRole("button", { name: "Add books from library" }));
  await user.click(
    await screen.findByRole("button", { name: "Added story (Format unknown)" }),
  );
  await user.click(screen.getByRole("button", { name: /Done/ }));
  expect(
    Array.from(
      screen.getByRole("list", { name: "Selected books" }).querySelectorAll("img"),
      (image) => image.getAttribute("src"),
    ),
  ).toEqual([savedCover, addedCover]);
});

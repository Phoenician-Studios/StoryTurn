export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { BookSearch } from "@/components/book-search";
import { getCurrentMember, getCurrentUser, getLibrary } from "@/lib/data";

export default async function LibraryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");
  const books = await getLibrary();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav displayName={member.displayName} />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <section className="animate-rise">
          <h1 className="font-display text-3xl text-primary">Family library</h1>
          <p className="mt-1 text-muted-foreground">
            Look up books and add them for every kid in the family.
          </p>
        </section>

        <section className="story-panel mt-6 rounded-2xl p-5 animate-rise-delay">
          <h2 className="font-display text-xl">Find a book</h2>
          <div className="mt-4">
            <BookSearch
              collectionKeys={books.flatMap((book) =>
                book.openLibraryKey ? [book.openLibraryKey] : [],
              )}
            />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl">In your collection</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {books.map((book) => (
              <li key={book.id} className="story-panel flex gap-3 rounded-2xl p-4">
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.coverUrl}
                    alt=""
                    className="h-20 w-14 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-14 items-center justify-center rounded bg-secondary text-xs text-muted-foreground">
                    Book
                  </div>
                )}
                <div>
                  <p className="font-medium">{book.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {book.authors.join(", ") || "Unknown author"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

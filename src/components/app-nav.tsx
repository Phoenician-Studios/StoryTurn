import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Tonight" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/library", label: "Library" },
  { href: "/schedule", label: "Schedule" },
  { href: "/family", label: "Family" },
];

export function AppNav({
  displayName,
}: {
  displayName: string;
}) {
  return (
    <header className="border-b border-border/70 bg-[color-mix(in_oklab,var(--card)_85%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-display text-xl tracking-tight text-primary">
            StoryTurn
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{displayName}</span>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
      <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-3 sm:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { logoutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Tonight" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/library", label: "Library" },
  { href: "/schedule", label: "Schedule" },
  { href: "/family", label: "Family" },
];

const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function AppNav({ displayName }: { displayName: string }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientSnapshot,
    serverSnapshot,
  );
  const expanded = !hydrated || open;

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <header
      className="border-b border-border/70 bg-[color-mix(in_oklab,var(--card)_85%,transparent)] backdrop-blur-md"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          toggleRef.current?.focus();
        }
      }}
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-display text-xl tracking-tight text-primary">
            StoryTurn
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
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
          <span className="hidden text-sm text-muted-foreground md:inline">
            {displayName}
          </span>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
          <button
            ref={toggleRef}
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen(!open)}
            className={`${hydrated ? "flex" : "hidden"} size-11 items-center justify-center rounded-lg text-primary transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden`}
          >
            <span aria-hidden="true" className="relative h-5 w-5">
              <span
                className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ease-in-out motion-reduce:transition-none ${open ? "translate-y-[9px] rotate-45" : ""}`}
              />
              <span
                className={`absolute left-0 top-[9px] h-0.5 w-5 rounded-full bg-current transition-all duration-200 ease-in-out motion-reduce:transition-none ${open ? "scale-x-0 opacity-0" : ""}`}
              />
              <span
                className={`absolute bottom-0 left-0 h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ease-in-out motion-reduce:transition-none ${open ? "-translate-y-[9px] -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>
      </div>
      <div
        id={menuId}
        inert={!expanded}
        aria-hidden={!expanded}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none md:hidden ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <nav
            aria-label="Mobile navigation"
            className="mx-auto flex max-w-5xl flex-col gap-1 px-4 pb-3"
          >
            <span className="px-3 py-2 text-sm text-muted-foreground">{displayName}</span>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

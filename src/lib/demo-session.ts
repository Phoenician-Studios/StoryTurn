import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { setDemoSessionUserId } from "@/lib/demo/store";

export const DEMO_SESSION_COOKIE = "storyturn_demo_session";

const COOKIE_OPTIONS = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 30,
};

/** Bind the current browser to a demo user id (server actions / route handlers only). */
export async function setDemoSessionCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(DEMO_SESSION_COOKIE, userId, COOKIE_OPTIONS);
  setDemoSessionUserId(userId);
}

export async function clearDemoSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(DEMO_SESSION_COOKIE);
  setDemoSessionUserId(null);
}

export function setDemoSessionCookieOnResponse(
  response: NextResponse,
  userId: string,
): void {
  response.cookies.set(DEMO_SESSION_COOKIE, userId, COOKIE_OPTIONS);
}

export function clearDemoSessionCookieOnResponse(response: NextResponse): void {
  response.cookies.delete(DEMO_SESSION_COOKIE);
}

export async function readDemoSessionCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(DEMO_SESSION_COOKIE)?.value ?? null;
}

/**
 * Prefer the browser session cookie over the process-global demo default so
 * invite links work for anonymous visitors on a fresh server.
 */
export async function hydrateDemoSessionFromCookie(): Promise<string | null> {
  const userId = await readDemoSessionCookie();
  setDemoSessionUserId(userId);
  return userId;
}

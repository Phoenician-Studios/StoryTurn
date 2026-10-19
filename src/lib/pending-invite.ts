import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { normalizeInviteCode } from "@/lib/domain/invites";

export const PENDING_INVITE_COOKIE = "storyturn_pending_invite";

export const PENDING_INVITE_COOKIE_OPTIONS = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
};

export async function setPendingInvite(code: string): Promise<string> {
  const normalized = normalizeInviteCode(code);
  const jar = await cookies();
  jar.set(PENDING_INVITE_COOKIE, normalized, PENDING_INVITE_COOKIE_OPTIONS);
  return normalized;
}

export function setPendingInviteOnResponse(
  response: NextResponse,
  code: string,
): string {
  const normalized = normalizeInviteCode(code);
  response.cookies.set(
    PENDING_INVITE_COOKIE,
    normalized,
    PENDING_INVITE_COOKIE_OPTIONS,
  );
  return normalized;
}

export async function peekPendingInvite(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(PENDING_INVITE_COOKIE)?.value;
  if (!value) return null;
  return normalizeInviteCode(value) || null;
}

export async function clearPendingInvite(): Promise<void> {
  const jar = await cookies();
  jar.delete(PENDING_INVITE_COOKIE);
}

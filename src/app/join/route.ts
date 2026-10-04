import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { normalizeInviteCode } from "@/lib/domain/invites";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = normalizeInviteCode(url.searchParams.get("code") ?? "");
  const user = await getCurrentUser();
  const response = NextResponse.redirect(
    new URL(user ? "/onboarding" : "/login", url.origin),
  );
  if (code) {
    response.cookies.set("storyturn-invite", code, {
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return response;
}

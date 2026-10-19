import { NextResponse } from "next/server";
import { appUrl } from "@/lib/config";
import {
  DEMO_SESSION_COOKIE,
  readDemoSessionCookie,
} from "@/lib/demo-session";
import {
  findInviteByCode,
  getCurrentMember,
  getCurrentUser,
  joinFamily,
  setDemoSessionUserId,
} from "@/lib/demo/store";
import {
  PENDING_INVITE_COOKIE,
  setPendingInviteOnResponse,
} from "@/lib/pending-invite";

function absolute(path: string, requestUrl: string): URL {
  try {
    return new URL(path, appUrl());
  } catch {
    return new URL(path, requestUrl);
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await context.params;
  const matched = findInviteByCode(rawCode);

  if (!matched) {
    return NextResponse.redirect(
      absolute("/invite/invalid?reason=not-found", request.url),
    );
  }

  if (!matched.usable.ok) {
    return NextResponse.redirect(
      absolute(
        `/invite/invalid?reason=${encodeURIComponent(matched.usable.reason)}`,
        request.url,
      ),
    );
  }

  // Only trust an explicit browser session cookie — never the process-global
  // demo default, which would skip signup for every invite on a fresh server.
  const sessionUserId = await readDemoSessionCookie();
  if (!sessionUserId) {
    const response = NextResponse.redirect(
      absolute(
        `/signup?invite=${encodeURIComponent(matched.code)}`,
        request.url,
      ),
    );
    setPendingInviteOnResponse(response, matched.code);
    return response;
  }

  setDemoSessionUserId(sessionUserId);
  const user = getCurrentUser();

  if (!user) {
    const response = NextResponse.redirect(
      absolute(
        `/signup?invite=${encodeURIComponent(matched.code)}`,
        request.url,
      ),
    );
    setPendingInviteOnResponse(response, matched.code);
    response.cookies.delete(DEMO_SESSION_COOKIE);
    return response;
  }

  if (getCurrentMember()) {
    const response = NextResponse.redirect(absolute("/", request.url));
    response.cookies.delete(PENDING_INVITE_COOKIE);
    return response;
  }

  try {
    joinFamily(matched.code);
    const response = NextResponse.redirect(absolute("/", request.url));
    response.cookies.delete(PENDING_INVITE_COOKIE);
    return response;
  } catch {
    const response = NextResponse.redirect(
      absolute(
        `/onboarding?invite=${encodeURIComponent(matched.code)}`,
        request.url,
      ),
    );
    setPendingInviteOnResponse(response, matched.code);
    return response;
  }
}
